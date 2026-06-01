def test_health(app_client):
    r = app_client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_create_group_members_expense_flow(app_client):
    g = app_client.post("/api/groups", json={"name": "Trip", "currency": "EUR"}).json()
    gid = g["id"]

    a = app_client.post(f"/api/groups/{gid}/members", json={"name": "Alice"}).json()
    b = app_client.post(f"/api/groups/{gid}/members", json={"name": "Bob"}).json()
    c = app_client.post(f"/api/groups/{gid}/members", json={"name": "Carol"}).json()

    r = app_client.post(
        f"/api/groups/{gid}/expenses",
        json={
            "payer_id": a["id"],
            "amount": "30.00",
            "description": "Dinner",
            "date": "2026-06-01",
            "shares": [
                {"member_id": a["id"], "percentage": "33.34"},
                {"member_id": b["id"], "percentage": "33.33"},
                {"member_id": c["id"], "percentage": "33.33"},
            ],
        },
    )
    assert r.status_code == 200, r.text

    expenses = app_client.get(f"/api/groups/{gid}/expenses").json()
    assert len(expenses) == 1

    stats = app_client.get(f"/api/groups/{gid}/stats").json()
    assert stats["total"] == "30.00"
    assert len(stats["settlements"]) == 2


def test_rejects_bad_share_sum(app_client):
    g = app_client.post("/api/groups", json={"name": "X", "currency": "EUR"}).json()
    a = app_client.post(f"/api/groups/{g['id']}/members", json={"name": "A"}).json()
    r = app_client.post(
        f"/api/groups/{g['id']}/expenses",
        json={
            "payer_id": a["id"],
            "amount": "10",
            "description": "",
            "date": "2026-06-01",
            "shares": [{"member_id": a["id"], "percentage": "50"}],
        },
    )
    assert r.status_code == 400


def test_formula_endpoint(app_client):
    r = app_client.post("/api/formula/eval", json={"expression": "12.50 + 7*2"})
    assert r.status_code == 200
    assert r.json()["value"] == "26.50"


def test_month_filter(app_client):
    g = app_client.post("/api/groups", json={"name": "M", "currency": "EUR"}).json()
    a = app_client.post(f"/api/groups/{g['id']}/members", json={"name": "A"}).json()
    for d in ("2026-05-15", "2026-06-15", "2026-06-20"):
        app_client.post(
            f"/api/groups/{g['id']}/expenses",
            json={
                "payer_id": a["id"],
                "amount": "10",
                "description": "",
                "date": d,
                "shares": [{"member_id": a["id"], "percentage": "100"}],
            },
        )
    jun = app_client.get(f"/api/groups/{g['id']}/expenses?year=2026&month=6").json()
    assert len(jun) == 2
