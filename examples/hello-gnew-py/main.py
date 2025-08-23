
from gnew import Gnew
api = Gnew(base_url="https://sandbox.api.gnew.local")
print("health:", api.health().get("status"))
print("echo:", api.echo("pong").get("echo"))

Scaffolder (opcional para DX)

