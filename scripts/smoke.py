"""Phase 1 smoke against an already running production server. Requires Playwright + Chromium."""
import json
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright
base='http://localhost:3000'
for route in ['/', '/admin', '/driver', '/api/health']:
    with urlopen(base+route) as response:
        assert response.status==200
        if route=='/api/health':
            data=json.load(response)
            assert data['services']['database']=='not_configured'
    print('HTTP 200', route)
try:
    urlopen(base+'/not-a-page')
    raise AssertionError('Missing 404')
except HTTPError as error:
    assert error.code==404
print('HTTP 404 verified')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width,height in [(1440,1000),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['/', '/admin', '/driver']:
            page.goto(base+route, wait_until='networkidle')
            assert page.locator('h1').count()==1
            assert page.locator('html').get_attribute('lang')=='es-SV'
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow {route} {width}'
            print('Browser OK', route, width)
        page.goto(base, wait_until='networkidle')
        page.get_by_role('link', name='Control de operación', exact=False).click()
        page.wait_for_url('**/admin')
        page.get_by_role('link', name='Ver espacio de repartidores', exact=False).click()
        page.wait_for_url('**/driver')
    assert not errors, errors
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto(base, wait_until='networkidle')
    Path('docs/screenshots').mkdir(exist_ok=True)
    page.screenshot(path='docs/screenshots/phase-1-desktop.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path='docs/screenshots/phase-1-mobile.png',full_page=True)
    browser.close()
print('PASS: HTTP, mobile/desktop overflow, navigation, no page errors')
