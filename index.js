const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.Payment_Secure_key);
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
        const paymentCollection = client.db('restaurants').collection('payments')



        // verify Admin after verify token 
        const verifyAdmin = async (req, res, next) => {
            // call kora token er email 
            const email = req.user.email;
            // email diye khoja hobe oi email userCollection e ace ki na 
            const Query = { email: email };
            // email diye khoje kora hocce
            const user = await userCollection.findOne(Query);

            // khoj korar por jei email ta pawya jabe oitar vitor jodi admin role na thake tahole se vul korce curi korar try korce 
            if (!user?.role === 'Admin') {
                return res.status(403).send({ message: ' Forbidden Access cannot verify admin ' })
            }
            // sobkicu thik thak thakle se porer thape jabe
            next()
        }


        // eta Cookie parser er poribotte local host e use kora hoyece tai cookie-parser middleware use hoy nai and res.cookie('token' : token , { httpOnly : true , secure : false}) use kora hoy nai 

        app.post('/jwt', async (req, res) => {
            const data = req.body;
            const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECURE, { expiresIn: '10h' });
            res.send({ token })
        })



        app.get('/users', verification, verifyAdmin, async (req, res) => {
            const data = await userCollection.find().toArray()
            res.send(data)
        })



        // user er role onujayi dashboard e routes show korar jonne 

        // User Admin ki na seta check hobe

        //admin er vitor email ta deya ace je email dilam oi email ta admin a ace ki na tumi check kore janaw amake 

        // eta admin ki na seta check korar jonne ekta verify token lagbe token verify hole tarpor admin check kora hobe 


        app.get('/users/admin/:email', verification, async (req, res) => {
            // jei email diye call kora hoyece sei email ta 
            const email = req.params.email;
            // console.log('email', email);
            // jei token diye call kora hoyece sei email ta 
            const userEmail = req.user.email;
            // console.log('user,email', userEmail);
            // userCollection er vitor ki diye search korbe seta
            const query = { email: email };
            // calling email ar token er email same ki na seta check korte hobe
            if (email != userEmail) {
                return res.status(403).send({ message: "forbidden Access user email is not admin " })
            }

            // userCollection er vitor email ta ace ki na seta check kore khuje ber kore niye aste hobe 
            const result = await userCollection.findOne(query);
            let Admin = false;

            // jodi email ta khuje pay tahole ar email er vitor role er man admin hoy thaole Admin= true hobe ar na pale admin= false thakbe ,, tahole se ar admin er route gulo dekhte pabe na 
            if (result) {
                Admin = result?.role === "Admin";
            }
            // admin true naki fale seta object akare send kore dey holo 
            res.send({ Admin })
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

        app.post('/menu', verification, verifyAdmin, async (req, res) => {
            const data = req.body;
            const result = await MenuCollection.insertOne(data)
            res.send(result)
        })

        app.patch('/menu/:id', verification, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: id };
            const option = { upsert: true };
            const updateDoc = {
                $set: data
            }
            const result = await MenuCollection.updateOne(query, updateDoc, option)
            res.send(result)
        })

        app.delete('/menu/:id', verification, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await MenuCollection.deleteOne(query)
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
            // console.log(' line 148', email);
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

        // payment Intern APIs

        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                payment_method_types: ['card'],

            })
            res.send({
                ClientSecret: paymentIntent.client_secret
            })
        })

        // payment users history
        app.get('/payments/:email', verification, async (req, res) => {
            const query = { email: req.params.email }
            if (req.params.email != req.user.email) {
                return res.status(403).send({ message: 'forbidden Access' })
            }
            const result = await paymentCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/payments', async (req, res) => {
            const data = req.body;
            console.log(data);
            const query = {
                _id: {
                    $in: data.cardId.map(id => new ObjectId(id))
                }
            }
            const deleteResult = await CartCollection.deleteMany(query)
            const paymentresult = await paymentCollection.insertOne(data);
            res.send({ paymentresult, deleteResult })
        })


        // starts or analitics 
        app.get('/admin-stats', verification, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const products = await MenuCollection.estimatedDocumentCount();
            const orders = await paymentCollection.estimatedDocumentCount();
            const result = await paymentCollection.aggregate([
                {
                    $group: {
                        _id: null,

                        totalReview: {
                            $sum: '$price'
                        }
                    }
                }
            ]).toArray();
            const revenue = result.length > 0 ? result[0].totalReview : 0;


            res.send({ users, products, orders, revenue })
        })


        // get payment information and find which products payment and find per products details which has a menu collections , first you go menu collection and match the payment menuItemsId in the _id ,

        app.get('/order-stats', verification , verifyAdmin, async (req, res) => {

            const result = await paymentCollection.aggregate([
                // payment collection theke menuItemId guleke split kore alada kore ber kore niye asi
                {
                    $unwind: "$menuItemId"
                },
                {
                    //menuItemId diye ekhn khujbo 
                    $lookup: {
                        // menu collection er vitor khujbo 
                        from: 'menu',
                        // menuItemId diye khubo
                        localField: 'menuItemId',
                        //menuItemId er sathe menu collection er _id er sathe match korbo 
                        foreignField: '_id',
                        // jegulo khuje pabo oiguloke ekta name diye sekhane rakhbo 
                        as: 'menuItems'
                    }
                },
                {
                    //details gulo  jekhane name diye rakhci take samne niye asbo 
                    $unwind: '$menuItems'
                },
                {
                    // eguloke ekta group korbo and kake kake nite cai ki ki nite cai segulo nite hobe 
                    $group: {
                        // _id name diye sokol category  er name gulo joma hoye thakbe 
                        _id: "$menuItems.category",
                        // sokol quentity gulo jog korbo 
                        quantity: {
                            $sum: 1
                        },
                        // sokol renevue gulo jog korbo mane price gulo
                        revenue: { $sum: '$menuItems.price' }

                    }
                },
                {
                    // eguloke modify korbo mane kontake ki name e pete cai egulo project er vitor nibo 
                    $project :{
                        //jake nite cai na take 0 dibo 
                        _id : 0,
                        category : '$_id',
                        quentity : '$quantity',
                        revenue : '$revenue'
                    }
                }
            ]).toArray()
            res.send(result)
        })


        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, (req, res) => {
    console.log(`Port Start ON ${port}`);
})