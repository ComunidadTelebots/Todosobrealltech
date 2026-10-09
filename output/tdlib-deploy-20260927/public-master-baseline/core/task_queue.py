import threading
import datetime


class TaskQueue:
    def __init__(self, log_func=None):
        self.queue = []  # List of {id, type, target, data, priority, status, time}
        self.lock = threading.Lock()
        self.counter = 0
        self._log = log_func if log_func is not None else lambda *args, **kwargs: None

    def add(self, t_type, target, data, priority=0):
        with self.lock:
            self.counter += 1
            task = {
                "id": self.counter,
                "type": t_type,
                "target": target,
                "data": data,
                "priority": priority,
                "status": "PENDING",
                "time": datetime.datetime.now().strftime("%H:%M:%S")
            }
            self.queue.append(task)
            self.queue.sort(key=lambda x: x["priority"], reverse=True)
            return task["id"]

    def get_all(self):
        with self.lock: return list(self.queue)

    def cancel(self, t_id):
        with self.lock:
            self.queue = [t for t in self.queue if t["id"] != t_id]

    def prioritize(self, t_id):
        with self.lock:
            for t in self.queue:
                if t["id"] == t_id: t["priority"] += 10
            self.queue.sort(key=lambda x: x["priority"], reverse=True)

    def process_next(self, bot_instance):
        with self.lock:
            if not self.queue: return False
            task = self.queue[0]
            if task["status"] == "RUNNING": return False
            task["status"] = "RUNNING"

        try:
            if task["type"] == "message":
                bot_instance.api_call("sendMessage", {"chat_id": task["target"], "text": task["data"]})
            elif task["type"] == "api_call":
                bot_instance.api_call(task["target"], task["data"])

            with self.lock:
                self.queue = [t for t in self.queue if t["id"] != task["id"]]
            return True
        except Exception as e:
            self._log("ERROR", f"Queue Task {task['id']} falló: {e}")
            with self.lock: task["status"] = "PENDING"
            return False
