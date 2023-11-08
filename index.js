const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin:['https://study-buddy-1db4a.web.app','https://study-buddy-1db4a.firebaseapp.com'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aj8rb8b.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// MiddleWare
const logger= async(req,res,next)=>{
  console.log('Call',req.host,req.originalUrl)
  next()
}

const verify = async(req,res,next)=>{
  const token = req.cookies?.token
  if(!token){
    return res.status(401).send({message:'Not Authorized'})
  }
  jwt.verify(token,process.env.TOKEN,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'UnAuthorized'})
    }
    console.log('Value',decoded)
    req.user=decoded;
    next()
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const assignmentCollection = client.db('assignmentdb').collection('assignments')
    const submittedCollection = client.db('assignmentdb').collection('submissions')


    // JWT Related API 
    app.post('/jwt', async(req,res)=>{
      const user = req.body
      console.log(user)
      const token = jwt.sign(user,process.env.TOKEN,{expiresIn:'1h'})
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      .send({success:true})
    })


    app.post('/logout',async(req,res)=>{
      const user = req.body;
      console.log('Logging Out',user)
      res
      .clearCookie('token',{maxAge:0})
      .send({success:true})

    })


    // ---Create Assignment---
    app.post('/assignments',verify,async(req,res)=>{
        const newAssignment = req.body
        console.log(newAssignment)

        const result = await assignmentCollection.insertOne(newAssignment)
        res.send(result)
    })

    // ---Get All Assignments---
    app.get('/assignments',async(req,res)=>{
        const result = await assignmentCollection.find().toArray()
        res.send(result)
    })

    // ---Update Assignment---
    app.get('/assignments/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await assignmentCollection.findOne(query)
      res.send(result)
    })

    app.put('/assignments/:id',async(req,res)=>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const options = {upsert : true}
      const updateAssignment = req.body 
      const assignment= {
        $set:{
          tittle : updateAssignment.tittle,
          description : updateAssignment.description,
          mark : updateAssignment.mark,
          photo : updateAssignment.photo,
          difficulty : updateAssignment.difficulty,
          date:updateAssignment.date
        }
      }
      const result = await assignmentCollection.updateOne(filter,assignment,options)
      res.send(result)
    })

    // ---Delete an Assignment---
    app.delete('/assignments/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id : new ObjectId(id)}
      const result = await assignmentCollection.deleteOne(query)
      res.send(result)
    })


    // ---Submit an Assignment---
    app.post('/submissions',async(req,res)=>{
      const submittedAssignment = req.body
      console.log(submittedAssignment)

      const result = await submittedCollection.insertOne(submittedAssignment)
      res.send(result)

    })

    // ---Get a Submission---
    app.get('/submissions',async(req,res)=>{
      const result = await submittedCollection.find().toArray()
      res.send(result)
    })



    // ---Get Submission By Email ---
    app.get('/singlesubmission', async(req,res)=>{
      console.log(req.query);
      console.log('token',req.cookies.token);
      let query = {};
      if(req.query?.userEmail){
        query={userEmail : req.query.userEmail}
      }
      const result = await submittedCollection.find(query).toArray()
      res.send(result)
    })


    // ---Update Staus---
    app.patch('/submissions/:id',async(req,res)=>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const updateStatus= req.body
      const updatedDoc = {
        $set : {
          status:updateStatus.status
        }
      }
      const result = await submittedCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Welcome to StuddyBuddy...')
})
app.listen(port,()=>{
    console.log(`StuddyBuddy Server is running on Port:${port}`)
})