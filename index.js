const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000
require('dotenv').config()


app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())




app.get('/', (req, res) => {
    res.send('hello everyone')
})



// const verify = (req, res, next) => {
//     const token = req.cookies.token;
//     if (!token) {
//         return res.status(401).send({ message: 'unauthorized user' })
//     }
//     jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             // return res.status(401).send({ message: 'forbidden' })
//             next()
//             req.user = decoded
//         }
//     })
// }


const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.send('forbidden')
    }
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = decoded;
        next();
    });
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8mn4lkn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const carDoctor = client.db("carDoctor");
        const servicesCollection = carDoctor.collection("services");
        const bookingCollection = carDoctor.collection("booking");


        // auth methods
        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '1h' });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                .send({ success: true })
        })


        app.post('/logout', async (req, res) => {
            const user = req.body
            res.clearCookie('token', { maxAge: 0 }).send({ logout: true })
        })


        app.get('/services', async (req, res) => {
            const query = servicesCollection.find()
            const result = await query.toArray()
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await servicesCollection.findOne(query)
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const newBooking = req.body
            const result = await bookingCollection.insertOne(newBooking)
            res.send(result)
        })


        app.get('/booking', verifyToken, async (req, res) => {
            const query = req.query
            console.log(req.user)
            if (req.user.email !== req.query.email) {
                return res.send({ message: 'forbidden' })
            }
            let option = {}
            if (query.email) {
                option = { email: query.email }
            }
            const result = await bookingCollection.find(option).toArray()
            res.send(result)
        })


        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`app running on this port ${port}`)
})