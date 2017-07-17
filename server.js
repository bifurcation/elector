'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const idChars = 8;

function newID() {
  return Array.from(new Uint8Array(idChars))
    .map(() => ((Math.random() * 0x10) & 0x0f).toString(16))
    .join("");
}

function tally(votes) {
  let counts = {};
  for (let id in votes) {
    let option = votes[id];
    counts[option] = (counts[option])? counts[option] + 1 : 1;
  }
  return counts;
}

function prepareForUser(user, session) {
  let admin = (user === session.admin);

  let prepared = {
    org: session.org,
    elections: {},
  };
  if (admin) {
    prepared.admin = session.admin;
    prepared.voters = session.voters;
  }

  let voterCount = Object.keys(session.voters).length;
  for (let id in session.elections) {
    let election = session.elections[id];
    let electionOut = {
      title: election.title,
      state: election.state,
      options: election.options,
    }

    switch (election.state) {
    case 'OPEN':
      let voted = Object.keys(election.votes)
      
      let missing = [];
      for (let id in session.voters) {
        if (!(id in election.votes)) {
          missing.push(id);
        }
      }

      if (admin) {
        electionOut.voted = voted;
        electionOut.missing = missing;
      } else {
        electionOut.voted = voted.length;
        electionOut.missing = missing.length;
      }
      break;
    case 'CLOSED':
      electionOut.voted = Object.keys(election.votes);
      electionOut.results = tally(election.votes);
      break;
    }

    prepared.elections[id] = electionOut;
  }

  return prepared;
}

class ElectionServer {
  constructor(options) {
    this.db = {};

    this.app = express();

    // Every POST should have a JSON body
    this.app.use(bodyParser.json());

    // Every request should be globally accessible
    this.app.all('/*', (req, res, next) => {
      res.set('access-control-allow-origin', '*');
      res.set('access-control-allow-headers', 'content-type');
      next();
    });

    // TODO: Attach actions
    this.app.post('/echo', (req, res) => this.echo(req, res));
    this.app.post('/new-session', (req, res) => this.newSession(req, res));
    this.app.post('/login', (req, res) => this.login(req, res));
    this.app.post('/end-session', (req, res) => this.endSession(req, res));
    this.app.post('/get-session', (req, res) => this.getSession(req, res));
    this.app.post('/update-session', (req, res) => this.updateSession(req, res));
    this.app.post('/vote', (req, res) => this.vote(req, res));
  }

  // XXX delete
  echo(req, res) {
    console.log('>>>', req.body);
    res.json(req.body);
  }

  newSession(req, res) {
    let session = {
      org: newID(),
      admin: newID(),
      voters: {},
      elections: {},
    };

    this.db[session.org] = session;
    res.json(session);
  }

  // Request body:
  // {
  //    "user": /* user secret */
  // }
  login(req, res) {
    let user = req.body.user;
    if (!user) {
      res.status(400);
      res.send("User code must be provided");
      return;
    }

    for (let org in this.db) {
      if ((user in this.db[org].voters) || (user === this.db[org].admin)) {
        res.json(prepareForUser(user, this.db[org]));
        return;
      }
    }

    res.status(400);
    res.send("No org found for user");
    return;
  }

  // Request body:
  // {
  //    "org": /* org ID */
  //    "user": /* user secret */
  // }
  endSession(req, res) {
    let org = req.body.org;
    let session = this.db[org];
    if (!session) {
      res.status(400);
      res.send("Unknown session");
      return
    }

    let user = req.body.user;
    if (user !== session.admin) {
      res.status(403);
      res.send("Unauthorized");
      return
    }

    delete this.db[org];
    res.json({});
    return
  }

  // Request body:
  // {
  //    "org": /* org ID */
  //    "user": /* user secret */
  //    "voters": /* new voters object */
  //    "elections": /* new elections array */
  // }
  //
  // Response body:
  // /* Session object (anonymized if not admin) */
  updateSession(req, res) {
    let org = req.body.org;
    let session = this.db[org];
    if (!session) {
      res.status(400);
      res.send("Unknown session");
      return
    }

    let user = req.body.user;
    if (user !== session.admin) {
      res.status(403);
      res.send("Unauthorized");
      return
    }

    // Just replace the voter list
    this.db[org].voters = req.body.voters;
    
    // Add any new elections
    for (let id in req.body.elections) {
      if (!(id in this.db[org].elections)) {
        this.db[org].elections[id] = req.body.elections[id];
      }
    }

    // Remove any removed elections
    for (let id in this.db[org].elections) {
      if (!(id in req.body.elections)) {
        delete this.db[org].elections[id];
      }
    }

    // Copy modifiable fiels in elections
    for (let id in this.db[org].elections) { 
      this.db[org].elections[id].state = req.body.elections[id].state;
    }
    
    res.json(prepareForUser(user, this.db[org]));
    return
  }

  // Request body:
  // {
  //    "org": /* org ID */
  //    "user": /* user secret */
  // }
  //
  // Response body:
  // /* Session object (anonymized if not admin) */
  getSession(req, res) {
    let org = req.body.org;
    let session = this.db[org];
    if (!session) {
      res.status(400);
      res.send("Unknown session");
      return
    }

    let user = req.body.user;
    let isAdmin = (user === session.admin);
    let isVoter = (user in session.voters);
    if (!isAdmin && !isVoter) {
      res.status(403);
      res.send("Unknown user")
    }

    res.json(prepareForUser(user, session));
    return
  }

  // Request body:
  // {
  //    "org": /* org ID */
  //    "user": /* user secret */
  //    "election": /* election ID */
  //    "option": /* option ID */
  // }
  vote(req, res) {
    let org = req.body.org;
    let session = this.db[org];
    if (!session) {
      res.status(400);
      res.send("Unknown session");
      return
    }

    let user = req.body.user;
    if (!(user in session.voters)) {
      res.status(403);
      res.send("Not a voter");
    }

    let electionID = req.body.election;
    let election = session.elections[electionID];
    if (!election) {
      res.status(400);
      res.send("Unknown election " + election);
      return
    }

    if (election.state !== 'OPEN') {
      res.status(400);
      res.send("Voting is not open");
      return
    }
    
    let option = req.body.option;
    if (!(option in election.options)) {
      res.status(400);
      res.send("Unknown option for election");
      return
    }

    this.db[org].elections[electionID].votes[user] = option;
    res.status(200);
    res.json({});
    return;
  }


  serve(port) {
    this.app.listen(port, () => {console.log("--- ready")});
  }
}

///// TODO move to lib/index.js (?)

let port = 8080;
let server = new ElectionServer();
server.serve(port);
