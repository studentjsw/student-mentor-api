import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT;
 const MONGO_URL = process.env.MONGO_URL;
async function createconnection() {
  const client = new MongoClient(MONGO_URL)
  await client.connect();
  return client;
}
//home
app.get("/", async (request, response) => {
  response.send("please add endpoints");
});
//students data
app.get("/students", async (request, response) => {
  const client = await createconnection();
  const result = await client.db("database").collection("students").find().toArray();
  response.send(result);
});
//mentors data
app.get("/mentors", async (request, response) => {
  const client = await createconnection();
  const result = await client.db("database").collection("mentors").find().toArray();
  response.send(result);
});
//creates a mentor with the details of him
app.post("/createMentor", async (request, response) => {
  const mentorDetails = request.body;
  const client = await createconnection();
  const result = await client.db("database").collection("mentors").insertOne(mentorDetails);
  response.send(result);
});
//creates a student with the details of him
app.post("/createStudent", async (request, response) => {
  const studentDetails = request.body;
  const client = await createconnection();
  const result = await client.db("database").collection("students").insertOne(studentDetails);
  response.send(result);
});
//assigns multiple students for a mentor
app.put("/assignStudents", async (request, response) => {
  const assignDetails = request.body;
  /* format of data sent in body would be as below
  {
  "newMentees":[ {
        "email": "vbp@hotmail.com",
        "mobileNo": "22338",
        "name": "vbp",
        "pic": "www.yahoo.com"
    },
     {
        "email": "sai@gmail.com",
        "mobileNo": "22338",
        "name": "sai",
        "pic": "www.yahoo.in"
    }
  ],
  "mentor": {
        "email": "asshok@gmail.com",
        "mobileNo": "9480",
        "name": "asshok",
        "pic": "google.com"
    }
}
  */
  const client = await createconnection();
  const result = await client.db("database").collection("mentors").updateOne(
    { email: assignDetails.mentor.email },        //filters the mentor from the list
    { $push: { "assigned": { $each: assignDetails.newMentees } } }  //adds new mentees to the filtered mentor
  );
  await client.db("database").collection("students").updateMany(
    { $or: assignDetails.newMentees },        //filters the new mentees from the list
    { $set: { "mentor": assignDetails.mentor } }  //adds the mentor to all new mentees
  );
  response.send(result);
});
//assigns a mentor to a student
app.put("/assignMentor", async (request, response) => {
  const assignDetails = request.body;
  const student = assignDetails.student;
  const oldMentor = assignDetails.oldMentor;
  const newMentor = assignDetails.newMentor;
  /* format of data sent in body would be as below
  {
  "student": {
        "email": "vbp@hotmail.com",
        "mobileNo": "22338",
        "name": "vbp",
        "pic": "www.yahoo.com"},
         "oldMentor": {
        "email": "sai@gmail.com",
        "mobileNo": "9480",
        "name": "sai",
        "pic": "google.com"
    },
 
    "newMentor":{
      "email": "majid@yahoo.com",
        "mobileNo": "1234",
        "name": "majid",
        "pic": "www.google.com"
    }
}
  */
  const client = await createconnection();
  if (oldMentor && oldMentor.email) {   //if the student is already assigned a mentor, that student will be removed from him
    await client.db("database").collection("mentors").updateOne(
      { email:oldMentor.email },                   //selects old mentor
      { $pull: {assigned:{email:student.email}} }  //removes the student from the mentor
    );
  };
   await client.db("database").collection("students").updateOne(
    {email: student.email },
    { $unset:{mentor:""} }  //removes the mentor from the student
  );
  const result = await client.db("database").collection("mentors").updateOne(
    { email: newMentor.email },
    { $push: { "assigned": student } }    //adds the student to the new mentor
  );
  await client.db("database").collection("students").updateOne(
    {email: student.email },                                                 //selects the student
    { $set: { "mentor": newMentor } }                //assigns new mentor to the student
  );
  response.send(result);  
});
//finds all the students assigned to a mentor
app.get("/mentees/:mentorEmail", async (request, response) => {
  const {mentorEmail} = request.params;
  const client = await createconnection();
  const result = await client.db("database").collection("mentors").aggregate([
    {
      "$match": {
        email: mentorEmail   //filters the mentor by the unique email
      }
    },
    {
      "$project": {
        assigned: 1,       //finds the assigned students
        _id: 0
      }
    }
  ]).toArray();
  response.send(result);
});

app.listen(PORT, () => console.log("The server is started"));