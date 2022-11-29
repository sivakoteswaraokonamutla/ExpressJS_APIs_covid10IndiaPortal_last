const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializedbandserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializedbandserver();
//API1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectuserquery = `select * from user where username='${username}';`;
  const dbres = await db.get(selectuserquery);
  if (dbres === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispsdmatched = await bcrypt.compare(password, dbres.password);
    if (ispsdmatched) {
      const payload = { username: username };
      const jwttoken = jwt.sign(payload, "siva_99");
      response.status(200);
      response.send({ jwttoken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//authentication
const authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "siva_99", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
//API2
app.get("/states/", authenticationToken, async (request, response) => {
  const query = `select state_id as stateId,state_name as stateName,population from state;`;
  const res = await db.all(query);
  response.send(res);
});
//API3
app.get("/states/:stateId/", authenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const query = `select state_id as stateId,state_name as stateName,population
   from state where state_id=${stateId};`;
  const res = await db.get(query);
  response.send(res);
});
//API4
app.post("/districts/", authenticationToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `insert into district(district_name,state_id,cases,cured,active,deaths)
    values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const res = await db.run(query);
  response.send("District Successfully Added");
});
//API5
app.get(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `select district_id as districtId,district_name as districtName,state_id as stateId,cases,cured,active,deaths
     from district where district_id=${districtId};`;
    const res = await db.get(query);
    response.send(res);
  }
);
//API6
app.delete(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `delete from district where district_id=${districtId};`;
    await db.run(query);
    response.send("District Removed");
  }
);
//API7
app.put(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const query = `update district set district_name='${districtName}',
state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths}
where district_id=${districtId};`;
    await db.run(query);
    response.send("District Details Updated");
  }
);
//API8
app.get(
  "/states/:stateId/stats/",
  authenticationToken,
  async (request, response) => {
    const { stateId } = request.params;
    const query = `select sum(cases) as totalCases,sum(cured) as totalCured,sum(active) as totalActive,sum(deaths) as totalDeaths
    from district where state_id=${stateId};`;
    const res = await db.get(query);
    response.send(res);
  }
);
module.exports = app;
