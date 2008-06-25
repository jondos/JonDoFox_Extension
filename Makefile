FILE = jondofox

xpi: ./src/*
	zip -Xvr ../xpi/jondofox.xpi ./src -x "*.svn/*"

clean:
	rm xpi/$(FILE).xpi
