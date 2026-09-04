from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_serves_frontend():
    response = client.get("/")
    assert response.status_code == 200
    assert "Family Health Records" in response.text or "html" in response.headers.get("content-type", "")

def test_api_families():
    response = client.get("/api/v1/families/default")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "members" in data
    assert len(data["members"]) > 0

def test_api_documents():
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) > 0
    doc = docs[0]
    assert doc["page_count"] == 10
    assert doc["observation_count"] > 20

def test_api_observations():
    response = client.get("/api/v1/documents")
    doc_id = response.json()[0]["id"]

    detail_res = client.get(f"/api/v1/documents/{doc_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["observations"]) > 20

def test_api_trends():
    persons_res = client.get("/api/v1/persons")
    person_id = persons_res.json()[0]["id"]

    trends_res = client.get(f"/api/v1/analytics/trends?person_id={person_id}")
    assert trends_res.status_code == 200
    trends = trends_res.json()
    assert len(trends) > 5

    # Test matrix
    matrix_res = client.get(f"/api/v1/analytics/matrix?person_id={person_id}")
    assert matrix_res.status_code == 200
    matrix = matrix_res.json()
    assert len(matrix["dates"]) > 0
    assert len(matrix["rows"]) > 0

def test_api_doctor_summary():
    persons_res = client.get("/api/v1/persons")
    person_id = persons_res.json()[0]["id"]

    summary_res = client.get(f"/api/v1/doctor-visit/summary?person_id={person_id}")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert len(summary["abnormal_findings"]) > 0
    assert len(summary["discussion_points"]) > 0

def test_api_delete_document():
    # Test deleting a document
    docs_res = client.get("/api/v1/documents")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    if len(docs) > 1:
        # Delete the last document
        target = docs[-1]
        del_res = client.delete(f"/api/v1/documents/{target['id']}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # Verify not in list
        new_docs = client.get("/api/v1/documents").json()
        assert not any(d["id"] == target["id"] for d in new_docs)
