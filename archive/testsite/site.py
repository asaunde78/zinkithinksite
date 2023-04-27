from flask import Flask
import requests
from bs4 import BeautifulSoup
app = Flask(__name__)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    # print("hello!")
    htmldoc = requests.get(path).content
    soup = BeautifulSoup(htmldoc, "html5lib")
    srcs = soup.find_all(attrs={"src": True})
    hrefs = (soup.find_all(attrs={"href": True}))
    with open("doc.txt", "a") as r:
        for s in srcs:
            r.write(str(s) + "\n")
            s["src"] = path + s["src"] 
            
            
        for h in hrefs:
            r.write(str(h)+ "\n")
            h["href"]  = path + h["href"] 


    return soup.prettify()


app.run(host="0.0.0.0",port = 6868)