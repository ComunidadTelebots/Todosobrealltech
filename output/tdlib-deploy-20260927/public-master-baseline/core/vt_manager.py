import requests


class VirusTotalManager:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://www.virustotal.com/api/v3"

    def scan_hash(self, file_hash):
        if not self.api_key:
            return {"error": "API Key no configurada"}
        try:
            headers = {"x-apikey": self.api_key}
            r = requests.get(f"{self.base_url}/files/{file_hash}", headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                stats = data["data"]["attributes"]["last_analysis_stats"]
                return {
                    "ok": True,
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "undetected": stats.get("undetected", 0),
                    "harmless": stats.get("harmless", 0),
                    "link": f"https://www.virustotal.com/gui/file/{file_hash}"
                }
            elif r.status_code == 404:
                return {"ok": True, "not_found": True}
            return {"error": f"Error VT: {r.status_code}"}
        except Exception as e:
            return {"error": str(e)}
