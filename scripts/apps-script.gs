/**
 * IPO Views — GMP webhook (Google Apps Script).
 *
 * Bind this to the Google Sheet that holds your GMP data, then deploy it as a
 * Web App (see SETUP.md → "Apps Script"). The /admin page POSTs to it.
 *
 * Expected sheet columns (row 1 = headers, exact lowercase names):
 *   name | slug | gmp | kostak | sub2 | sentiment | last_updated
 *
 * Set a Script Property named ADMIN_PASSWORD (Project Settings → Script Properties).
 * It MUST equal the ADMIN_PASSWORD env var used by the site.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ error: 'Empty request body.' });
    }
    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (!expected) return _json({ error: 'Server not configured: set ADMIN_PASSWORD script property.' });
    if (String(body.password || '') !== String(expected)) return _json({ error: 'Unauthorized: incorrect password.' });
    if (!body.name) return _json({ error: 'Missing IPO name.' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('GMP') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return _json({ error: 'Sheet has no data rows.' });

    var header = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var col = {
      name: header.indexOf('name'),
      gmp: header.indexOf('gmp'),
      kostak: header.indexOf('kostak'),
      sub2: header.indexOf('sub2'),
      updated: header.indexOf('last_updated')
    };
    if (col.name < 0) return _json({ error: 'Sheet is missing a "name" column.' });

    var target = String(body.name).trim().toLowerCase();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][col.name]).trim().toLowerCase() === target) {
        var rowNum = r + 1; // 1-based, +1 for header
        if (col.gmp >= 0 && body.gmp !== undefined && body.gmp !== '') {
          sheet.getRange(rowNum, col.gmp + 1).setValue(Number(body.gmp));
        }
        if (col.kostak >= 0 && body.kostak !== undefined && body.kostak !== '') {
          sheet.getRange(rowNum, col.kostak + 1).setValue(Number(body.kostak));
        }
        if (col.sub2 >= 0 && body.sub2 !== undefined && body.sub2 !== '') {
          sheet.getRange(rowNum, col.sub2 + 1).setValue(Number(body.sub2));
        }
        if (col.updated >= 0) {
          sheet.getRange(rowNum, col.updated + 1).setValue(new Date().toISOString());
        }
        return _json({ success: true, name: body.name, row: rowNum });
      }
    }
    return _json({ error: 'IPO not found in sheet: ' + body.name });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

// Health check: visiting the web app URL in a browser returns this.
function doGet() {
  return _json({ ok: true, service: 'IPO Views GMP webhook' });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
