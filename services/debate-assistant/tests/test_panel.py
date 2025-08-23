import os, sys, pytest 
from httpx import AsyncClient, ASGITransport 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
import importlib.util 
spec = importlib.util.spec_from_file_location( 
"deb_assistant", os.path.join(ROOT, "services", 
"debate-assistant", "main.py") 
) 
mod = importlib.util.module_from_spec(spec) 
spec.loader.exec_module(mod) 
app = mod.app 
@pytest.mark.asyncio 
async def test_ingest_panel_and_feedback(): 
    transport = ASGITransport(app=app) 
    async with AsyncClient(transport=transport, 
base_url="http://test") as ac: 
        r = await ac.post("/ingest", json={ 
            "ext_id": "thread-1", 
            "title": "Gobernanza: Presupuesto Q1", 
            "messages": [ 
                {"author": "ana", "text": "Propongo destinar 30% a 
I+D. Acción: definir KPIs."}, 
                {"author": "bob", "text": "Debemos decidir criterios 
de asignación."}, 
                {"author": "carla", "text": "Sugiero planificar review 
mensual y dueños."}, 
            ], 
        }) 
        assert r.status_code == 200 
        tid = r.json()["thread_id"] 
 
        p = await ac.get(f"/panel/{tid}") 
        assert p.status_code == 200 
        data = p.json() 
        assert "tldr" in data and data["tags"] 
 
        q = await ac.post("/qa", json={"thread_id": tid, "question": 
"¿Qué acciones se acordaron?"}) 
        assert q.status_code == 200 
        assert "answer" in q.json() 
 
        f1 = await ac.post("/feedback", json={"thread_id": tid, 
"score": 5}) 
        f2 = await ac.post("/feedback", json={"thread_id": tid, 
"score": 4}) 
        assert f2.json()["perceived_accuracy_pct"] >= 80.0 
 
 
