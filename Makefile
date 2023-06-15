upload:
	rm *.zip; zip -r -D upload.zip * -x “.DS_Store” -x “.env” -x “.git” -q