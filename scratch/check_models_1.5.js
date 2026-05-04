
const https = require('https');

const apiKey = "AIzaSyCxeO--HZ1VT8qWmefayuyM991YCsdS64o";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const json = JSON.parse(data);
        const models = json.models.map(m => m.name);
        console.log(models.filter(m => m.includes('1.5')));
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
