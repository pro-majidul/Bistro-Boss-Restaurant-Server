const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express();
const port = process.env.PORT || 9000
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Local Host Play on port 9000')
})


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

        const MenuCollection = client.db('restaurants').collection('menu')
        const ReviewCollection = client.db('restaurants').collection('reviews')
        const CartCollection = client.db('restaurants').collection('carts')

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
            const query = { email: email }
            const result = await CartCollection.find(query).toArray()
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