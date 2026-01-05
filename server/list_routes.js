const express = require('express');
const app = express();

const formsRouter = require('./src/api/routes/forms');
app.use('/api/forms', formsRouter);
app.use('/api/submissions', require('./src/api/routes/submissions'));
app.use('/api/ai', require('./src/api/routes/ai'));
app.use('/api/workflows', require('./src/api/routes/workflows'));
app.use('/api/insights', require('./src/api/routes/insights'));
app.use('/api/ai-providers', require('./src/api/routes/ai-providers'));
app.use('/api/auth', require('./src/api/routes/auth'));
app.use('/api/admin', require('./src/api/routes/admin'));
app.use('/api/settings', require('./src/api/routes/settings'));
app.use('/api/files', require('./src/api/routes/files'));
app.use('/api/integrations', require('./src/api/routes/integrations'));
app.use('/api/reports', require('./src/api/routes/reports'));
app.use('/api/users', require('./src/api/routes/users'));
app.use('/api/roles', require('./src/api/routes/roles'));

function print(path, layer) {
    if (layer.route) {
        layer.route.stack.forEach(print.bind(null, path + (layer.route.path || '')))
    } else if (layer.name === 'router' && layer.handle.stack) {
        layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source.replace('\\/?', '').replace('(?=\\/|$)', '').replace('^', ''))))
    } else if (layer.method) {
        console.log('%s /%s', layer.method.toUpperCase(), path.split('/').filter(Boolean).join('/'))
    }
}

app._router.stack.forEach(print.bind(null, ''))
