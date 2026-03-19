import zipfile
import os

epub_path = 'test.epub'

mimetype = b'application/epub+zip'

container_xml = b'''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>'''

content_opf = b'''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>Test Book</dc:title>
        <dc:creator opf:role="aut">Test Author</dc:creator>
        <dc:language>en-US</dc:language>
        <dc:identifier id="BookID">urn:uuid:12345</dc:identifier>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="page1" href="text.html" media-type="application/xhtml+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="page1"/>
    </spine>
</package>'''

toc_ncx = b'''<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:12345"/>
    </head>
    <docTitle><text>Test Book</text></docTitle>
    <navMap>
        <navPoint id="navPoint-1" playOrder="1">
            <navLabel><text>Chapter 1</text></navLabel>
            <content src="text.html"/>
        </navPoint>
    </navMap>
</ncx>'''

text_html = b'''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Chapter 1</title>
</head>
<body>
    <h1>Chapter 1</h1>
    <p>This is a test book for end-to-end testing.</p>
</body>
</html>'''

with zipfile.ZipFile(epub_path, 'w', zipfile.ZIP_DEFLATED) as epub:
    # mimetype must be uncompressed
    epub.writestr('mimetype', mimetype, compress_type=zipfile.ZIP_STORED)
    epub.writestr('META-INF/container.xml', container_xml)
    epub.writestr('OEBPS/content.opf', content_opf)
    epub.writestr('OEBPS/toc.ncx', toc_ncx)
    epub.writestr('OEBPS/text.html', text_html)

print("Created test.epub successfully.")
