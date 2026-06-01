def _bootstrap(app_client):
    g = app_client.post("/api/groups", json={"name": "G", "currency": "EUR"}).json()
    a = app_client.post(f"/api/groups/{g['id']}/members", json={"name": "A"}).json()
    b = app_client.post(f"/api/groups/{g['id']}/members", json={"name": "B"}).json()
    return g, a, b


def _add_expense(app_client, g, payer, date, amount="10"):
    return app_client.post(
        f"/api/groups/{g['id']}/expenses",
        json={
            "payer_id": payer["id"],
            "amount": amount,
            "description": f"E {date}",
            "date": date,
            "shares": [{"member_id": payer["id"], "percentage": "100"}],
        },
    ).json()


def test_transactions_paginated_sorted_by_creation(app_client):
    g, a, _ = _bootstrap(app_client)
    # Insertion order matters; expense.date is the user-picked day and can be
    # any past day. The list reflects what was added when.
    dates = ("2026-01-15", "2026-06-20", "2026-03-01", "2026-06-15")
    for d in dates:
        _add_expense(app_client, g, a, d)

    page = app_client.get(f"/api/groups/{g['id']}/transactions?limit=2&offset=0").json()
    assert page["total"] == 4
    assert page["limit"] == 2
    assert page["offset"] == 0
    # Most recently added rows first.
    assert [i["date"] for i in page["items"]] == ["2026-06-15", "2026-03-01"]

    page2 = app_client.get(f"/api/groups/{g['id']}/transactions?limit=2&offset=2").json()
    assert [i["date"] for i in page2["items"]] == ["2026-06-20", "2026-01-15"]


def test_transactions_month_filter(app_client):
    g, a, _ = _bootstrap(app_client)
    _add_expense(app_client, g, a, "2026-05-15")
    _add_expense(app_client, g, a, "2026-06-15")
    page = app_client.get(
        f"/api/groups/{g['id']}/transactions?year=2026&month=6"
    ).json()
    assert page["total"] == 1
    assert page["items"][0]["date"] == "2026-06-15"


def test_transactions_includes_settlements(app_client):
    g, a, b = _bootstrap(app_client)
    app_client.post(
        f"/api/groups/{g['id']}/expenses",
        json={
            "payer_id": a["id"],
            "amount": "20",
            "description": "x",
            "date": "2026-06-10",
            "shares": [
                {"member_id": a["id"], "percentage": "50"},
                {"member_id": b["id"], "percentage": "50"},
            ],
        },
    )
    app_client.post(f"/api/groups/{g['id']}/settle")
    page = app_client.get(f"/api/groups/{g['id']}/transactions").json()
    kinds = [i["kind"] for i in page["items"]]
    assert "expense" in kinds and "settlement" in kinds
