#!/bin/bash

# Use this script to generate a distributable .xpi 
# including the chrome-folder as a .jar-archive

# Check for existence of the .xpi
if [ -e "xpi/jondofox.xpi" ]; then
  echo \*\* Removing existing *.xpi ..
  rm xpi/jondofox.xpi
fi

# Create a jarfile in src/chrome containing chrome contents
echo \*\* Creating jarfile containing \'chrome\':
cd src/chrome
zip -Xvr9 jondofox.jar ./ -x "*.svn/*" "*.swp"
cd ../..

# Create the .xpi
echo \*\* Creating \'jondofox.xpi\':
cd src
# Exclude chrome from the zip
zip -Xvr9 ../xpi/jondofox.xpi ./ -x "*.svn/*" "*.swp" "chrome/*"
# Move jondofox.jar into the .xpi
zip -Xvm9 ../xpi/jondofox.xpi ./chrome/jondofox.jar
cd ..
