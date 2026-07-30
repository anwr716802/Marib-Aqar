export default async function handler(req, res) {
  const id = req.query.id;

  if (!id) {
    return res.status(400).send("Missing ID");
  }

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyjvZ5jUKs8ysbkIOql8Aexpki2HXDgD6zkQ1MurmnQRmVodij8Tx9kwwEtPJaGM1s/exec';

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL + '?action=getProducts');
    const data = await response.json();

    const rows = data.slice(1);
    const product = rows.find(p => String(p[0]) === id);

    if (!product) {
      return res.status(404).send("Not found");
    }

    const name = product[1];
    const price = product[3];
    const desc = product[4];
    const images = product[5] ? product[5].split(",") : [];
    const image = images[0] || "";
    const whatsapp = product[6] || "967770569067";

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${name}</title>

<meta name="description" content="${desc}">
<meta property="og:title" content="${name}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:type" content="article">

</head>
<body>

<h1>${name}</h1>
<img src="${image}" style="width:100%;max-height:400px;">
<h2>${price} ريال</h2>
<p>${desc}</p>

<a href="https://wa.me/${whatsapp}">تواصل واتساب</a>

</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (e) {
    res.status(500).send("Error");
  }
}
