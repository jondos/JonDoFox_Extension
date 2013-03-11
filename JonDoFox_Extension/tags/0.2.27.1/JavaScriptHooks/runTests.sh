#!/bin/sh

torBrowserPath="/home/jack/Georg/Arbeit/Computersicherheit/Internetanon/JAP/Arbeit/JonDoFox_Extension_Material/Torbutton/Dev_Test/TBB/tor-browser_en-US"

mozmill -t tests/ -b "$torBrowserPath/App/Firefox/firefox" -p "$torBrowserPath/Data/profile"
