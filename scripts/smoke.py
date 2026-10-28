"""Non-operational smoke against a server started on localhost:3000.
Use test:flow for the authenticated real-database acceptance scenario.
Requires Python Playwright and system Chromium; neither is an application runtime dependency.
"""
import json
from urllib.request import urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright
base = 'http://localhost:3000'
for route in ['/', '/admin', '/driver', '/track', '/api/health', '/manifest.webmanifest', '/driver/manifest.webmanifest']:
    with urlopen(base + route) as response:
        assert response.status == 200
        if route == '/api/health':
            data = json.load(response)
            assert data['phase'] == 8
            assert data['services']['database'] in ['not_configured', 'configuration_present_unverified']
        if route == '/driver/manifest.webmanifest':
            assert json.load(response)['start_url'] == '/driver'
    print('HTTP 200', route)
try:
    urlopen(base + '/not-a-page')
    raise AssertionError('Missing 404')
except HTTPError as error:
    assert error.code == 404
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width, height in [(1440, 1000), (390, 844), (320, 740)]:
        page.set_viewport_size({'width': width, 'height': height})
        for route in ['/', '/admin', '/driver', '/track']:
            page.goto(base + route, wait_until='networkidle')
            assert page.locator('h1').count() == 1
            assert page.locator('html').get_attribute('lang') == 'es-SV'
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow {route} {width}'
            print('Browser OK', route, width)
    assert not errors, errors
    page.goto(base + '/driver', wait_until='networkidle')
    assert page.locator('link[rel="manifest"]').get_attribute('href') == '/driver/manifest.webmanifest'
    browser.close()
print('PASS: public HTTP/404, separate driver manifest, responsive shell and no browser runtime errors')
