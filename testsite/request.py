import requests
from bs4 import BeautifulSoup
url = "https://leagueoflegends.fandom.com/wiki/Karma/LoL"
htmldoc = requests.get(url).content
soup = BeautifulSoup(htmldoc, "html5lib")
with open("doc.txt", "w") as r:
    r.write(soup.prettify())