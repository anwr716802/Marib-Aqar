export default async function handler(req, res) {

  const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzyjvZ5jUKs8ysbkIOql8Aexpki2HXDgD6zkQ1MurmnQRmVodij8Tx9kwwEtPJaGM1s/exec';

  try {

    const response = await fetch(
      GOOGLE_SCRIPT_URL + '?action=getProducts'
    );

    const data = await response.json();

    // حذف عنوان الأعمدة
    const products = data.slice(1);

    let urls = `
    <url>
      <loc>https://marib-aqar.vercel.app/</loc>
      <priority>1.0</priority>
    </url>

    <url>
      <loc>https://marib-aqar.vercel.app/products.html</loc>
      <priority>0.9</priority>
    </url>
    `;


    products.forEach(product => {

      const id = product[0];

      urls += `
      <url>
        <loc>https://marib-aqar.vercel.app/products.html?id=${id}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>
      `;

    });


    const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>

    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

    ${urls}

    </urlset>
    `;


    res.setHeader('Content-Type', 'application/xml');

    res.status(200).send(sitemap);


  } catch(error){

    res.status(500).send(error.message);

  }

}
