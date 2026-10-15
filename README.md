# Topup Sensei 📱 — Mobile Topup / Recharge Vendor Agent

A Claude Code slash command for mobile topup (prepaid recharge) vendors on the Xoxoday platform. It has three modes:

| Mode | Use it to |
|---|---|
| **Onboard** | Integrate a new topup vendor end-to-end: question batches → feasibility → branch check → code → tests → cross-repo handoff |
| **Debug** | Trace a topup problem across storefront, product-listing, order-process-ms, vendor-integrations, karma and karma_reports (stuck pending, double recharge, no plans, operator not detected, sync disabled products…) |
| **Test** | Vendor API contract tests with the Postman CLI first, then Jest unit tests of our connector using the captured responses |

Before any feasibility verdict it asks for **staging credentials** and runs **every vendor API** live with the Postman CLI. It only calls an integration 100% feasible when every endpoint passed. It writes the vendor config into the repo with the staging URL and credentials. That file is gitignored, so it stays local; you swap in production values. If the vendor has a balance endpoint, it also writes the karma_reports balance module.

## What it knows

- The full topup flow: DTOne operator detection → `product_to_operator` → dummy operator parents → plan list in Elasticsearch → order → OPMS vendor selection → VI procure → retries, refetch, recon, refund.
- The two reference integrations, DTOne and Mobikwik, and the money rules learned from them: `voucher_insert_details.reuse` idempotency, pending as its own state, refetch recursion guard, `error_reason` only for provable failures, one active vendor per product, loud catalog failures.
- The batch product sync and how it can disable live products.
- What a new vendor needs in every repo and DB table, per environment.

## What it writes (vendor-integrations)

| File | Action |
|---|---|
| `src/vendors/integratedVendors/{vendorName}.ts` | Created |
| `src/vendors/vendorTemplates/{vendorName}.ts` | Created |
| `src/configs/baseConfigs.json.sample` | Updated (`vendorClassIdMapping`, no secrets) |
| `tests/vendors/{vendorName}.*.test.ts` + fixtures | Created |
| `src/configs/vendorConfigs/{VendorName}.json` | Created locally with staging values (gitignored) |
| `karma_reports` balance module | Only if the vendor has a balance endpoint |
| karma: `config.php.sample`, `vendor_tables.php`, `sale/{slug}_topup_voucher` listing page (controller, model, language, tpl), `header.tpl`, `product_automation.tpl`, `order_list.tpl` if there is a balance | Created/updated (Phase 3C) |

Everything else comes as an ordered handoff checklist: OPMS config, the real karma `config.php` per env, permissions, DB tables/rows, product-listing data and plumAuth. Shared karma bugs, such as `addProduct` dropping `parent_product_id`, are proposed with exact fixes, never changed without approval.

## Installation

```bash
cp topup-sensei.md /path/to/your/project/.claude/commands/
```

Then in Claude Code:

```
/topup-sensei
```

Say "onboard" (or drop the vendor's API docs), "debug <order id / symptom>", or "test".

## Examples

`examples/` holds the worked test example the skill points to, run against Mobikwik on 2026-10-15:

- `mobikwik-plans.postman_collection.json` + `data.json`: vendor API contract test of the public plans endpoint across operators and circles. Run it with `postman collection run mobikwik-plans.postman_collection.json -d data.json`. Result: 80/80 assertions; it surfaced duplicate BSNL SKUs and an HTTP-200 `success:false` error shape.
- `mobikwikTopup.formatProductResponse.test.ts` + `mobikwikPlans.json`: Jest unit tests for the connector (SKU format, decimal handling, dedupe, payment payload). In vendor-integrations they live in `tests/vendors/` and `tests/vendors/fixtures/`.

## Related

- [akatsuki-gift-cards](https://github.com/abhishekkxoxo/akatsuki-gift-cards): gift card vendors
- [merch-sensei](https://github.com/abhishekkxoxo/merch-sensei): merchandise vendors
