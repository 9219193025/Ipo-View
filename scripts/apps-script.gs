/**
 * IPO Views — IPO webhook (Google Apps Script).
 *
 * Bind this to the Google Sheet that holds your IPO data, then deploy it as a
 * Web App (see SETUP.md → "Apps Script"). The /admin page POSTs to it.
 *
 * Supported actions (JSON body field "action"):
 *   updateGMP  — set gmp / kostak / sub2 on an existing row (matched by name)
 *   addIPO     — append a brand-new IPO row (rejects duplicate slug)
 *   updateIPO  — overwrite all provided fields on an existing row (matched by slug, then name)
 *   deleteIPO  — remove a row (matched by slug, then name)
 * (An absent/"update" action is treated as updateGMP for backward compatibility.)
 *
 * Expected sheet columns (row 1 = headers, exact lowercase names). Missing columns
 * are auto-created by addIPO/updateIPO when needed:
 *   name | slug | type | exchange | price_min | price_max | lot_size |
 *   open_date | close_date | allotment_date | listing_date |
 *   gmp | kostak | sub2 | status | registrar | sentiment | last_updated
 *
 * Set a Script Property named ADMIN_PASSWORD (Project Settings → Script Properties).
 * It MUST equal the ADMIN_PASSWORD env var used by the site.
 */

var ALL_COLUMNS = [
  'name', 'slug', 'type', 'exchange', 'price_min', 'price_max', 'lot_size',
  'open_date', 'close_date', 'allotment_date', 'listing_date',
  'gmp', 'kostak', 'sub2', 'status', 'registrar', 'sentiment', 'last_updated'
];
var NUMERIC_COLUMNS = ['price_min', 'price_max', 'lot_size', 'gmp', 'kostak', 'sub2'];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json({ error: 'Empty request body.' });
    }
    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (!expected) return _json({ error: 'Server not configured: set ADMIN_PASSWORD script property.' });
    if (String(body.password || '') !== String(expected)) return _json({ error: 'Unauthorized: incorrect password.' });

    var action = String(body.action || 'updateGMP');
    if (action === 'update') action = 'updateGMP';

    var sheet = _sheet();

    if (action === 'addIPO') return _addIPO(sheet, body);
    if (action === 'updateIPO') return _updateIPO(sheet, body);
    if (action === 'deleteIPO') return _deleteIPO(sheet, body);
    if (action === 'updateGMP') return _updateGMP(sheet, body);
    return _json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

// Health check: visiting the web app URL in a browser returns this.
function doGet() {
  return _json({ ok: true, service: 'IPO Views IPO webhook' });
}

/* --------------------------------------------------------------- actions */

function _updateGMP(sheet, body) {
  if (!body.name) return _json({ error: 'Missing IPO name.' });
  var ctx = _readSheet(sheet);
  if (ctx.col.name < 0) return _json({ error: 'Sheet is missing a "name" column.' });

  var target = String(body.name).trim().toLowerCase();
  for (var r = 1; r < ctx.data.length; r++) {
    if (String(ctx.data[r][ctx.col.name]).trim().toLowerCase() === target) {
      var rowNum = r + 1; // 1-based, +1 for header
      _setIfPresent(sheet, rowNum, ctx.col.gmp, body.gmp, true);
      _setIfPresent(sheet, rowNum, ctx.col.kostak, body.kostak, true);
      _setIfPresent(sheet, rowNum, ctx.col.sub2, body.sub2, true);
      _stampUpdated(sheet, rowNum, ctx.col.last_updated);
      return _json({ success: true, name: body.name, row: rowNum });
    }
  }
  return _json({ error: 'IPO not found in sheet: ' + body.name });
}

function _addIPO(sheet, body) {
  if (!body.name) return _json({ error: 'Missing IPO name.' });
  var col = _ensureColumns(sheet);
  var ctx = _readSheet(sheet);

  var slug = String(body.slug || _slugify(body.name)).trim().toLowerCase();
  for (var r = 1; r < ctx.data.length; r++) {
    var rowSlug = ctx.col.slug >= 0 ? String(ctx.data[r][ctx.col.slug]).trim().toLowerCase() : '';
    var rowName = String(ctx.data[r][ctx.col.name]).trim().toLowerCase();
    if ((slug && rowSlug === slug) || rowName === String(body.name).trim().toLowerCase()) {
      return _json({ error: 'An IPO with this name/slug already exists: ' + body.name });
    }
  }

  var row = [];
  for (var c = 0; c < ALL_COLUMNS.length; c++) {
    row.push(_valueFor(ALL_COLUMNS[c], body, slug));
  }
  // Align with however many columns the sheet actually has.
  var width = sheet.getLastColumn();
  while (row.length < width) row.push('');
  sheet.appendRow(row.slice(0, Math.max(width, ALL_COLUMNS.length)));
  return _json({ success: true, name: body.name, slug: slug, action: 'addIPO' });
}

function _updateIPO(sheet, body) {
  _ensureColumns(sheet);
  var ctx = _readSheet(sheet);
  var rowNum = _findRow(ctx, body);
  if (rowNum < 0) return _json({ error: 'IPO not found in sheet: ' + (body.slug || body.name) });

  for (var k = 0; k < ALL_COLUMNS.length; k++) {
    var name = ALL_COLUMNS[k];
    if (name === 'last_updated') continue;
    var ci = ctx.col[name];
    if (ci === undefined || ci < 0) continue;
    if (body[name] === undefined || body[name] === '') continue;
    var isNum = NUMERIC_COLUMNS.indexOf(name) >= 0;
    sheet.getRange(rowNum, ci + 1).setValue(isNum ? Number(body[name]) : body[name]);
  }
  _stampUpdated(sheet, rowNum, ctx.col.last_updated);
  return _json({ success: true, name: body.name, slug: body.slug, action: 'updateIPO', row: rowNum });
}

function _deleteIPO(sheet, body) {
  var ctx = _readSheet(sheet);
  var rowNum = _findRow(ctx, body);
  if (rowNum < 0) return _json({ error: 'IPO not found in sheet: ' + (body.slug || body.name) });
  sheet.deleteRow(rowNum);
  return _json({ success: true, name: body.name, slug: body.slug, action: 'deleteIPO' });
}

/* --------------------------------------------------------------- helpers */

function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName('GMP') || ss.getSheets()[0];
}

function _readSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var header = (data[0] || []).map(function (h) { return String(h).trim().toLowerCase(); });
  var col = {};
  for (var i = 0; i < ALL_COLUMNS.length; i++) col[ALL_COLUMNS[i]] = header.indexOf(ALL_COLUMNS[i]);
  return { data: data, header: header, col: col };
}

/** Find a row (1-based) by slug first, then name. Returns -1 if absent. */
function _findRow(ctx, body) {
  var slug = String(body.slug || '').trim().toLowerCase();
  var name = String(body.name || '').trim().toLowerCase();
  for (var r = 1; r < ctx.data.length; r++) {
    var rowSlug = ctx.col.slug >= 0 ? String(ctx.data[r][ctx.col.slug]).trim().toLowerCase() : '';
    var rowName = ctx.col.name >= 0 ? String(ctx.data[r][ctx.col.name]).trim().toLowerCase() : '';
    if (slug && rowSlug === slug) return r + 1;
    if (name && rowName === name) return r + 1;
  }
  return -1;
}

/** Ensure every column in ALL_COLUMNS exists; append missing headers. Returns the col map. */
function _ensureColumns(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var toAdd = [];
  for (var i = 0; i < ALL_COLUMNS.length; i++) {
    if (header.indexOf(ALL_COLUMNS[i]) < 0 && toAdd.indexOf(ALL_COLUMNS[i]) < 0) toAdd.push(ALL_COLUMNS[i]);
  }
  if (toAdd.length) {
    sheet.getRange(1, header.length + 1, 1, toAdd.length).setValues([toAdd]);
  }
  return _readSheet(sheet).col;
}

function _valueFor(colName, body, slug) {
  if (colName === 'slug') return slug;
  if (colName === 'last_updated') return new Date().toISOString();
  var v = body[colName];
  if (v === undefined || v === '') return '';
  return NUMERIC_COLUMNS.indexOf(colName) >= 0 ? Number(v) : v;
}

function _setIfPresent(sheet, rowNum, ci, value, numeric) {
  if (ci >= 0 && value !== undefined && value !== '') {
    sheet.getRange(rowNum, ci + 1).setValue(numeric ? Number(value) : value);
  }
}

function _stampUpdated(sheet, rowNum, ci) {
  if (ci >= 0) sheet.getRange(rowNum, ci + 1).setValue(new Date().toISOString());
}

function _slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
