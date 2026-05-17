#!/usr/bin/env python

import cgi
import os
import sys
import json
import string 
import random

# CGI troubleshooting
import cgitb
cgitb.enable()

##### Supporting Functions
def send_error(code, msg):
    print "Status: {} {}".format(code, msg)
    print
    quit()

def token(n):
    return "".join(random.choice(string.ascii_uppercase) for x in range(n))

def new_state():
    state = {
        "org": token(4),
        "admin": token(8),
        "voters": {},
        "elections": []
    }
    
    # TODO: Store state
    return state

##### Application Logic

# Reject non-POST requests
if os.environ['REQUEST_METHOD'] != 'POST':
    send_error(405, "Only POST requests allowed")

# Parse JSON from the request body
req = None
try:
    req = json.load(sys.stdin)
except Exception as e:
    send_error(400, "Bad JSON")
resp = None

#if "action" not in req:
#    send_error(400, "No action specified in request")
#action = req["action"]

print "ok!"
quit()

# If this is a request for a new org, make it and return
if action == "new-org":
    print >>sys.stderr, "new-org"
    resp = new_state()
    if resp is None:
        send_error(503, "Error creating new org")

    print "Content-Type: text/json"
    print
    json.dump(resp)
    quit()

# Check that this request is for a defined org
# Check to see whether this is an admin
# Check to see whether this is a valid voter

# Write the response out as JSON
print "Content-Type: text/json"
print
json.dump(resp, sys.stdout)

print >>sys.stderr, "blergh"





##########
quit()

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
