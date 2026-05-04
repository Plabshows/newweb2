
const https = require('https');

const apiKey = "AIzaSyCxeO--HZ1VT8qWmefayuyM991YCsdS64o";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                const models = json.models.map(m => m.name);
                console.log(models);
            } else {
                console.log('No models found or error:', data);
            }
        } catch (e) {
            console.error('Error parsing response:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
