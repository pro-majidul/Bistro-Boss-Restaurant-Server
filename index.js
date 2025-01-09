const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 9000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Local Host Play on port 9000')
})

//jwt  Verification Midleware

const verification = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorize Access' })
    }

    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECURE, (err, dec) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorize Access' })
        }
        req.user = dec;
        next()

    })

}
const verifyAdmin = async (req, res, next) => {
    const email = req.user.email;
    const Query = { email: email };
    const user = await userCollection.findOne(Query);
    if (!user?.role === 'Admin') {
        return res.status(403).send({ message: ' Forbidden Access' })
    }
    next()
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xihi8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });

        const userCollection = client.db('restaurants').collection('users')
        const MenuCollection = client.db('restaurants').collection('menu')
        const ReviewCollection = client.db('restaurants').collection('reviews')
        const CartCollection = client.db('restaurants').collection('carts')




        // eta Cookie parser er poribotte local host e use kora hoyece tai cookie-parser middleware use hoy nai and res.cookie('token' : token , { httpOnly : true , secure : false}) use kora hoy nai 

        app.post('/jwt', async (req, res) => {
            const data = req.body;
            const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECURE, { expiresIn: '5h' });
            res.send({ token })
        })



        app.get('/users', verification, verifyAdmin, async (req, res) => {
            const data = await userCollection.find().toArray()
            res.send(data)
        })

        app.post('/users', async (req, res) => {
            const data = req.body;
            const query = { email: data.email }
            const isAxist = await userCollection.findOne(query)
            if (isAxist) {
                return res.send({ message: 'User data alrady added in database ', insertedId: null })
            }
            const result = await userCollection.insertOne(data);
            res.send(result);
        })

        app.patch('/users/admin/:id', verification, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.delete('/users/:id', verification, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/menu', async (req, res) => {
            const result = await MenuCollection.find().toArray()
            res.send(result)
        })
        app.get('/review', async (req, res) => {
            const result = await ReviewCollection.find().toArray()
            res.send(result)
        })
        app.post('/carts', async (req, res) => {
            const cartInfo = req.body;
            const result = await CartCollection.insertOne(cartInfo);
            res.send(result);
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = {
                userEmail: email
            }
            const result = await CartCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await CartCollection.deleteOne(query)
            res.send(result)
        })





        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, (req, res) => {
    console.log(`Port Start ON ${port}`);
})