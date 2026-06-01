def _setup_group(app_client, n=3):
    g = app_client.post("/api/groups", json={"name": "G", "currency": "EUR"}).json()
    members = []
    for name in ["Alice", "Bob", "Carol"][:n]:
        members.append(
            app_client.post(f"/api/groups/{g['id']}/members", json={"name": name}).json()
        )
    return g, members


def test_settle_zeroes_balances(app_client):
    g, [a, b, c] = _setup_group(app_client)
    # Alice pays 30, split equally
    app_client.post(
        f"/api/groups/{g['id']}/expenses",
        json={
            "payer_id": a["id"],
            "amount": "30",
            "description": "Dinner",
            "date": "2026-06-01",
            "shares": [
                {"member_id": a["id"], "percentage": "33.34"},
                {"member_id": b["id"], "percentage": "33.33"},
                {"member_id": c["id"], "percentage": "33.33"},
            ],
        },
    )
    pre = app_client.get(f"/api/groups/{g['id']}/stats").json()
    assert len(pre["settlements"]) == 2

    r = app_client.post(f"/api/groups/{g['id']}/settle")
    assert r.status_code == 200
    assert len(r.json()) == 2

    post = app_client.get(f"/api/groups/{g['id']}/stats").json()
    assert post["settlements"] == []
    for bal in post["balances"]:
        assert abs(float(bal["net"])) < 0.01


def test_settle_idempotent_when_already_zero(app_client):
    g, _ = _setup_group(app_client, n=2)
    r = app_client.post(f"/api/groups/{g['id']}/settle")
    assert r.status_code == 200
    assert r.json() == []
