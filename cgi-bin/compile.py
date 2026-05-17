#!/usr/bin/env python

import cgi
import subprocess
import shlex
import string 
import random
import os
import sys
import shutil

# CGI troubleshooting
import cgitb
cgitb.enable()

salt = "".join(random.choice(string.ascii_uppercase) for x in range(6))
mkdfile = "./tmp/{0}".format(salt)
xmlfile = "./tmp/{0}.xml".format(salt)
txtfile = "./tmp/{0}.txt".format(salt)
errfile = "./tmp/{0}.err".format(salt)
divider = "-----DRAFTR-----"

# Populate the Markdown file from the request body and process
with open(mkdfile, 'w') as mkdfobj:
    shutil.copyfileobj(sys.stdin, mkdfobj)
subprocess.call(shlex.split("./bin/compile.sh {0}".format(mkdfile)))

# If there's a problem, print the error file
try:
    print "Content-Type: text/plain"
    print
    with open(mkdfile, 'r') as mkdfobj:
        shutil.copyfileobj(mkdfobj, sys.stdout)
    print divider
    with open(xmlfile, 'r') as xmlfobj:
        shutil.copyfileobj(xmlfobj, sys.stdout)
    print divider
    with open(txtfile, 'r') as txtfobj:
        shutil.copyfileobj(txtfobj, sys.stdout)
except IOError:
    print "Status: 503 Markdown Compilation Error"
    print "Content-Type: text/plain"
    print 
    with open(errfile, 'r') as errfobj:
        shutil.copyfileobj(errfobj, sys.stdout)


# cleanup
#subprocess.call(shlex.split("rm tmp/{0} tmp/{0}.xml tmp/{0}.txt tmp/{0}.err".format(salt)))
