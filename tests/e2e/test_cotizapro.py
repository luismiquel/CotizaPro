import pytest
import time
from playwright.sync_api import Page, expect


def test_page_loads(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    expect(page).to_have_title("CotizaPro")
    expect(page.locator(".logo-text")).to_have_text("CotizaPro")


def test_initial_item_row_present(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    rows = page.locator(".item-row")
    expect(rows).to_have_count(1)


def test_add_item_button(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.click("#btnAddItem")
    rows = page.locator(".item-row")
    expect(rows).to_have_count(2)


def test_remove_item(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.click("#btnAddItem")
    expect(page.locator(".item-row")).to_have_count(2)
    page.locator(".btn-remove").first.click()
    expect(page.locator(".item-row")).to_have_count(1)


def test_total_calculation(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    row = page.locator(".item-row").first
    row.locator("[data-field='price']").fill("100")
    row.locator("[data-field='qty']").fill("3")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")
    expect(row.locator(".item-total")).to_have_text("$300.00")
    expect(page.locator("#summarySubtotal")).to_have_text("$300.00")
    expect(page.locator("#summaryTotal")).to_have_text("$300.00")


def test_tax_toggle(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    row = page.locator(".item-row").first
    row.locator("[data-field='price']").fill("200")
    row.locator("[data-field='qty']").fill("1")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")

    expect(page.locator("#taxRow")).to_be_hidden()
    page.check("#taxEnabled")
    expect(page.locator("#taxInputWrap")).to_be_visible()
    expect(page.locator("#taxRow")).to_be_visible()
    expect(page.locator("#summaryTax")).to_have_text("$32.00")
    expect(page.locator("#summaryTotal")).to_have_text("$232.00")


def test_discount_fixed(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    row = page.locator(".item-row").first
    row.locator("[data-field='price']").fill("100")
    row.locator("[data-field='qty']").fill("1")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")

    page.check("#discountEnabled")
    page.fill("#discountValue", "20")
    page.locator("#discountValue").dispatch_event("input")
    expect(page.locator("#summaryTotal")).to_have_text("$80.00")


def test_discount_percent(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    row = page.locator(".item-row").first
    row.locator("[data-field='price']").fill("200")
    row.locator("[data-field='qty']").fill("1")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")

    page.check("#discountEnabled")
    page.select_option("#discountMode", "percent")
    page.fill("#discountValue", "10")
    page.locator("#discountValue").dispatch_event("input")
    expect(page.locator("#summaryTotal")).to_have_text("$180.00")


def test_preview_updates_on_form_fill(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.fill("#clientName", "Empresa XYZ")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Mi Negocio")
    page.locator("#issuerName").dispatch_event("input")
    expect(page.locator("#quotePreview")).to_contain_text("Empresa XYZ")
    expect(page.locator("#quotePreview")).to_contain_text("Mi Negocio")


def test_save_and_load_quote(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.fill("#clientName", "Cliente Test")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Emisor Test")
    page.locator("#issuerName").dispatch_event("input")

    row = page.locator(".item-row").first
    row.locator("[data-field='name']").fill("Servicio A")
    row.locator("[data-field='price']").fill("500")
    row.locator("[data-field='qty']").fill("2")
    row.locator("[data-field='name']").dispatch_event("input")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")

    page.click("#btnSave")
    expect(page.locator("#toast")).to_contain_text("guardada")

    page.on("dialog", lambda d: d.accept())
    page.click("#btnNewQuote")
    time.sleep(0.3)

    page.click("#btnSavedQuotes")
    expect(page.locator(".saved-item")).to_have_count(1)
    expect(page.locator(".saved-item")).to_contain_text("Cliente Test")

    page.locator("[data-load]").first.click()
    expect(page.locator("#clientName")).to_have_value("Cliente Test")
    expect(page.locator("#issuerName")).to_have_value("Emisor Test")


def test_delete_saved_quote(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.fill("#clientName", "Para Borrar")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Empresa")
    page.locator("#issuerName").dispatch_event("input")
    page.click("#btnSave")
    time.sleep(0.3)

    page.click("#btnSavedQuotes")
    expect(page.locator(".saved-item")).to_have_count(1)

    page.on("dialog", lambda d: d.accept())
    page.locator("[data-delete]").first.click()
    time.sleep(0.3)
    expect(page.locator(".empty-state")).to_be_visible()


def test_notes_appear_in_preview(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.fill("#clientName", "Test")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Test Co")
    page.locator("#issuerName").dispatch_event("input")
    page.fill("#notes", "Válido por 15 días")
    page.locator("#notes").dispatch_event("input")
    expect(page.locator("#quotePreview")).to_contain_text("Válido por 15 días")


def test_multiple_items_subtotal(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    row1 = page.locator(".item-row").first
    row1.locator("[data-field='price']").fill("100")
    row1.locator("[data-field='qty']").fill("2")
    row1.locator("[data-field='price']").dispatch_event("input")
    row1.locator("[data-field='qty']").dispatch_event("input")

    page.click("#btnAddItem")
    row2 = page.locator(".item-row").nth(1)
    row2.locator("[data-field='price']").fill("50")
    row2.locator("[data-field='qty']").fill("4")
    row2.locator("[data-field='price']").dispatch_event("input")
    row2.locator("[data-field='qty']").dispatch_event("input")

    expect(page.locator("#summarySubtotal")).to_have_text("$400.00")
    expect(page.locator("#summaryTotal")).to_have_text("$400.00")


def test_default_issuer_email(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    value = page.locator("#issuerEmail").input_value()
    assert value == "luismiguelgarciadelasmorenas@gmail.com"


def test_quote_number_increments(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.evaluate("localStorage.removeItem('cotizapro_nextQuoteNumber')")
    page.reload(timeout=60000)

    page.fill("#clientName", "Cliente A")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Emisor")
    page.locator("#issuerName").dispatch_event("input")
    expect(page.locator("#quotePreview")).to_contain_text("#0001")

    page.on("dialog", lambda d: d.accept())
    page.click("#btnNewQuote")
    time.sleep(0.3)

    page.fill("#clientName", "Cliente B")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Emisor")
    page.locator("#issuerName").dispatch_event("input")
    expect(page.locator("#quotePreview")).to_contain_text("#0002")


def test_email_buttons_present(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    expect(page.locator("#btnEmailSend")).to_be_visible()
    expect(page.locator("#btnEmailCopy")).to_be_visible()


def test_copy_email_no_items_shows_toast(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.evaluate("localStorage.clear()")
    page.reload(timeout=60000)
    page.locator(".btn-remove").first.click()
    page.click("#btnEmailCopy")
    expect(page.locator("#toast")).to_contain_text("ítem")


def test_copy_email_success(page: Page, app_url):
    page.goto(app_url, timeout=60000)
    page.fill("#clientName", "Test Cliente")
    page.locator("#clientName").dispatch_event("input")
    page.fill("#issuerName", "Mi Empresa")
    page.locator("#issuerName").dispatch_event("input")
    row = page.locator(".item-row").first
    row.locator("[data-field='name']").fill("Servicio X")
    row.locator("[data-field='price']").fill("100")
    row.locator("[data-field='qty']").fill("1")
    row.locator("[data-field='name']").dispatch_event("input")
    row.locator("[data-field='price']").dispatch_event("input")
    row.locator("[data-field='qty']").dispatch_event("input")

    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.click("#btnEmailCopy")
    expect(page.locator("#toast")).to_contain_text("copiado")
