const Plugin = files => {

    const items = []
    for (const { name, size, mtime } of files) {
        const lastModified = (new Date(mtime)).toLocaleString()
        items.push(`<li><h3><a href="${name}">${name}</a></h3>Size: <b>${size}</b> - Last modified <b>${lastModified}</a></li>`)
    }
    return `<html>
<head>
    <title>Downloads...</title>
</head>

<body>
    <h1>Downloads</h1>
    <hr>
    <ul>${items.join('')}</ul>
    <hr>
</body>
</html>`
}

module.exports = Plugin