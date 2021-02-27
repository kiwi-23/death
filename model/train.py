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

TOKENIZER_CHOICE_NLTK = "nltk"
TOKENIZER_CHOICE_SIMPLE = "simple"
TOKENIZER_CHOICES = [
    TOKENIZER_CHOICE_NLTK,
    TOKENIZER_CHOICE_SIMPLE
]
parser.add_argument("-t", "--tokenizer", default=TOKENIZER_CHOICE_NLTK, choices=TOKENIZER_CHOICES, help="Which tokenizer should be used.")
parser.add_argument("--remove-stop-words", action="store_true", help="Remove stopwords from the corpus.")
args = parser.parse_args()

output_text_file = args.output

listOfFiles = []
if os.path.isdir(args.input):
    listOfFiles = glob.glob(args.input + "/*.txt")
else:
    listOfFiles.append(args.input)

if args.remove_stop_words:
    try:
        stop_words = nltk.corpus.stopwords.words("english")
        stopwords_dict = Counter(stop_words)
    except LookupError:
        nltk.download("stopwords")
    stop_words = nltk.corpus.stopwords.words("english")
    stopwords_dict = Counter(stop_words)

if args.tokenizer == TOKENIZER_CHOICE_NLTK:
    try:
        sentences = nltk.tokenize.sent_tokenize("Useless. Do we have punkt?")
    except LookupError:
        nltk.download("punkt")

final_sentences = []
for file in listOfFiles:
    text = open(file).read().lower().replace("\n", " ")

    if args.remove_stop_words:
        text = " ".join([word for word in text.split() if word not in stopwords_dict])

    if args.tokenizer == TOKENIZER_CHOICE_NLTK:
        sentences = nltk.tokenize.sent_tokenize(text)
        for sentence in sentences:
            words = nltk.tokenize.word_tokenize(sentence)
            for word in words:
                match = re.search("[\d.]", word)
                if match:
                    words.remove(word)
            final_sentences.append(words)
    else:
        sentences = re.split("[.?!]", text)
        for sentence in sentences:
            words = re.split(r'\W+', sentence)
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
