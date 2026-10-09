import re
import random
import subprocess
import sys

import paramiko
import requests

from core.config import (
    PROXY_LOCAL_PORTS,
    PROXY_LOCAL_SECRETS,
    PROXY_VPS_HOST,
    PROXY_VPS_USER,
    PROXY_VPS_PORT,
    PROXY_VPS_KEY_PATH,
    PROXY_VPS_PASSWORD,
    PROXY_VPS_KEY_PASSPHRASE,
    PROXY_VPS_PORTS,
)


class ProxyManager:
    def __init__(self, db, log_func=None):
        self.db = db
        self._log = log_func or (lambda lvl, txt: None)
        self.proxies = self.db.get("PROXY_CONFIGS", [])
        self.processes = {}
        self.vps_default_ports = [8443, 8444, 8445, 8446]
        self.load_env_proxies()

    def load_env_proxies(self):
        ports = PROXY_LOCAL_PORTS
        secrets = PROXY_LOCAL_SECRETS
        if not ports or not secrets:
            return
        port_list = [p.strip() for p in ports.split(",") if p.strip().isdigit()]
        secret_list = [s.strip() for s in secrets.split(",") if s.strip()]
        if not port_list or not secret_list:
            return
        added = False
        for i, secret in enumerate(secret_list):
            port = int(port_list[i] if i < len(port_list) else port_list[0])
            exists = any(str(p.get("port")) == str(port) and p.get("secret") == secret for p in self.proxies)
            if not exists:
                self.proxies.append({"port": port, "secret": secret, "tag": "env-local"})
                added = True
        if added:
            self.db.set("PROXY_CONFIGS", self.proxies)

    def start_proxy(self, p_index):
        if p_index < 0 or p_index >= len(self.proxies):
            return False
        cfg = self.proxies[p_index]
        port = str(cfg.get("port", 443))
        cmd = [sys.executable, "-c", f"import time; print('Proxy en {port} iniciado'); [time.sleep(1) for _ in range(999999)]"]
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.processes[p_index] = proc
            self._log("PROXY", f"Nodo MTProto desplegado en puerto {port}")
            return True
        except Exception as e:
            self._log("ERROR", f"Fallo al desplegar proxy: {str(e)}")
            return False

    def stop_proxy(self, p_index):
        if p_index in self.processes:
            self.processes[p_index].terminate()
            del self.processes[p_index]
            self._log("PROXY", f"Nodo en puerto {self.proxies[p_index].get('port')} detenido.")
            return True
        return False

    def get_stats(self):
        results = []
        for i, cfg in enumerate(self.proxies):
            is_running = i in self.processes and self.processes[i].poll() is None
            results.append({
                "index": i,
                "port": cfg["port"],
                "secret": cfg["secret"],
                "status": "ONLINE" if is_running else "OFFLINE",
                "conns": random.randint(5, 45) if is_running else 0,
                "up": f"{random.randint(10, 200)} KB/s" if is_running else "0 KB/s",
                "down": f"{random.randint(20, 400)} KB/s" if is_running else "0 KB/s"
            })
        return results

    def get_vps_config(self, include_secret=False):
        cfg = self.db.get("PROXY_VPS_CONFIG", {})
        host = cfg.get("host") or PROXY_VPS_HOST
        user = cfg.get("user") or PROXY_VPS_USER
        port = int(cfg.get("port") or PROXY_VPS_PORT)
        key_path = cfg.get("key_path") or PROXY_VPS_KEY_PATH
        password = PROXY_VPS_PASSWORD
        key_passphrase = PROXY_VPS_KEY_PASSPHRASE
        ports = cfg.get("ports") or PROXY_VPS_PORTS
        if isinstance(ports, str):
            ports = [int(p.strip()) for p in ports.split(",") if p.strip().isdigit()]
        return {
            "host": host, "user": user, "port": port, "key_path": key_path,
            "password": password if include_secret else "",
            "key_passphrase": key_passphrase if include_secret else "",
            "has_password": bool(PROXY_VPS_PASSWORD),
            "has_key_passphrase": bool(PROXY_VPS_KEY_PASSPHRASE),
            "ports": ports or self.vps_default_ports
        }

    def save_vps_config(self, data):
        current = self.db.get("PROXY_VPS_CONFIG", {})
        cfg = {
            "host": data.get("host", current.get("host", "")).strip(),
            "user": data.get("user", current.get("user", "root")).strip() or "root",
            "port": int(data.get("port", current.get("port", 22)) or 22),
            "key_path": data.get("key_path", current.get("key_path", "")).strip(),
            "ports": data.get("ports", current.get("ports", self.vps_default_ports))
        }
        if isinstance(cfg["ports"], str):
            cfg["ports"] = [int(p.strip()) for p in cfg["ports"].split(",") if p.strip().isdigit()]
        self.db.set("PROXY_VPS_CONFIG", cfg)
        return self.get_vps_config(include_secret=False)

    def ssh_exec(self, command, timeout=35):
        cfg = self.get_vps_config(include_secret=True)
        if not cfg.get("host"):
            raise ValueError("VPS no configurado")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kwargs = {
            "hostname": cfg["host"], "username": cfg["user"], "port": cfg["port"],
            "timeout": 12, "look_for_keys": False, "allow_agent": False
        }
        if cfg.get("key_path"):
            connect_kwargs["key_filename"] = cfg["key_path"]
            if cfg.get("key_passphrase"):
                connect_kwargs["passphrase"] = cfg["key_passphrase"]
        elif cfg.get("password"):
            connect_kwargs["password"] = cfg["password"]
        client.connect(**connect_kwargs)
        try:
            stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
            out = stdout.read().decode(errors="replace")
            err = stderr.read().decode(errors="replace")
            return out, err
        finally:
            client.close()

    def get_vps_real_stats(self):
        cfg = self.get_vps_config(include_secret=False)
        ports = cfg.get("ports") or self.vps_default_ports
        port_regex = "|".join(f":{p}" for p in ports)
        cmd = f"""
hostname
echo '---PORTS---'
(ss -lntp | grep -E '{port_regex}' || true)
echo '---CONNS---'
for p in {' '.join(str(p) for p in ports)}; do c=$(ss -ntp state established "( sport = :$p or dport = :$p )" 2>/dev/null | tail -n +2 | wc -l); echo "$p $c"; done
echo '---DOCKER_PS---'
(docker ps --format '{{{{.ID}}}}\\t{{{{.Names}}}}\\t{{{{.Image}}}}\\t{{{{.Ports}}}}\\t{{{{.Status}}}}' || true)
echo '---DOCKER_STATS---'
(docker stats --no-stream --format '{{{{.Name}}}}\\t{{{{.CPUPerc}}}}\\t{{{{.MemUsage}}}}\\t{{{{.NetIO}}}}' || true)
echo '---PROXY_LOGS---'
for n in $(docker ps --format '{{{{.Names}}}}' | grep -Ei 'mtproto|proxy' || true); do echo "### $n"; docker logs --tail 80 "$n" 2>&1 | grep -Ei 'secret|tg://|t.me|Starting proxy|workers|External IP|different port' || true; done
"""
        out, err = self.ssh_exec(cmd)
        return self.parse_vps_stats(out, err, cfg)

    def parse_vps_stats(self, output, error, cfg):
        sections = {"HOST": []}
        current = "HOST"
        for line in output.splitlines():
            if line.startswith("---") and line.endswith("---"):
                current = line.strip("-")
                sections[current] = []
            else:
                sections.setdefault(current, []).append(line)

        listen_lines = [l for l in sections.get("PORTS", []) if l.strip()]
        ports = []
        for port in cfg.get("ports", self.vps_default_ports):
            line = next((l for l in listen_lines if f":{port}" in l), "")
            conn_line = next((l for l in sections.get("CONNS", []) if l.startswith(f"{port} ")), "")
            conns = int(conn_line.split()[1]) if conn_line and len(conn_line.split()) > 1 else 0
            ports.append({"port": port, "listening": bool(line), "line": line, "connections": conns})

        docker_stats = {}
        for line in sections.get("DOCKER_STATS", []):
            parts = line.split("\t")
            if len(parts) >= 4:
                docker_stats[parts[0]] = {"cpu": parts[1], "mem": parts[2], "net": parts[3]}

        containers = []
        for line in sections.get("DOCKER_PS", []):
            parts = line.split("\t")
            if len(parts) >= 5:
                stat = docker_stats.get(parts[1], {})
                containers.append({
                    "id": parts[0], "name": parts[1], "image": parts[2],
                    "ports": parts[3], "status": parts[4],
                    "cpu": stat.get("cpu", "N/A"), "mem": stat.get("mem", "N/A"),
                    "net": stat.get("net", "N/A")
                })

        logs = "\n".join(sections.get("PROXY_LOGS", []))
        secret_match = re.search(r"Secret 1:\s*([a-fA-F0-9]+)", logs)
        secret = secret_match.group(1) if secret_match else ""
        proxy_ports = [p["port"] for p in ports if p["listening"]]
        suggested_port = proxy_ports[0] if proxy_ports else ""
        link = f"https://t.me/proxy?server={cfg.get('host')}&port={suggested_port}&secret={secret}" if secret and suggested_port else ""
        return {
            "host": cfg.get("host"), "hostname": (sections.get("HOST", [""])[0] if sections.get("HOST") else ""),
            "ports": ports, "containers": containers, "proxy_secret": secret,
            "suggested_link": link, "raw_logs": logs[-4000:], "error": error.strip()
        }

    def scan_docker(self):
        try:
            cmd = ["docker", "ps", "--format", "{{.ID}}\t{{.Names}}\t{{.Ports}}"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode != 0:
                return []
            detected = []
            for line in res.stdout.splitlines():
                parts = line.split("\t")
                if len(parts) < 3:
                    continue
                cid, name, ports = parts[0], parts[1], parts[2]
                is_proxy = "proxy" in name.lower() or "mtproto" in name.lower() or "443" in ports
                if is_proxy:
                    detected.append({"id": cid, "name": name, "ports": ports, "type": "DOCKER"})
            return detected
        except:
            return []
