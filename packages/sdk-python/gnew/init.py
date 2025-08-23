
class Gnew:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def health(self):
        return {"status": "ok"}

    def echo(self, msg: str):
        return {"echo": msg}


