import re
import json
import sys
import argparse
import glob
import os
from collections import Counter

from gensim.models import Word2Vec
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

parser = argparse.ArgumentParser(description="Text File to Word2Vec Vectors")
parser.add_argument("input", help="Path to the input text file")
parser.add_argument("-o", "--output", default="vector.json", help="Path to the output text file (default: vector.json)")

args = parser.parse_args()
output_text_file = args.output

listOfFiles = []
if os.path.isdir(args.input):
    listOfFiles = glob.glob(args.input + "/*.txt")
else:
    listOfFiles.append(args.input)

try:
    sentences = nltk.tokenize.sent_tokenize("Useless. Do we have punkt?")
except LookupError:
    nltk.download("punkt")

final_sentences = []
for file in listOfFiles:
    text = open(file).read().lower().replace("\n", " ")

sentences = nltk.tokenize.sent_tokenize(text)
for sentence in sentences:
    words = nltk.tokenize.word_tokenize(sentence)
    for word in words:
        match = re.search("[\d.]", word)
        if match:
            words.remove(word)
    final_sentences.append(words)

model = Word2Vec(final_sentences, size=100, window=5, min_count=5, workers=4)
model.wv.save_word2vec_format(output_text_file, binary=False)

f = open(output_text_file)
v = {"vectors": {}}
for line in f:
    w, n = line.split(" ", 1)
    v["vectors"][w] = list(map(float, n.split()))

with open(output_text_file[:-4] + "json", "w") as out:
    json.dump(v, out)
