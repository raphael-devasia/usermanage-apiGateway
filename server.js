require("dotenv").config()
const express = require("express")
const grpc = require("@grpc/grpc-js")
const protoLoader = require("@grpc/proto-loader")
const path = require("path")
const cors = require("cors")
const bodyParser = require("body-parser")

const app = express()
app.use(express.json())

app.use(
    cors({
        origin: "http://localhost:4200", // Replace this with your frontend's URL
        methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed methods if needed
        credentials: true, // Enable if you need cookies
    })
)
app.use(bodyParser.json())

// Load gRPC clients
// const authProtoPath = path.join(__dirname, "../auth-service/proto/auth.proto")
// const userProtoPath = path.join(__dirname, "../user-service/proto/user.proto")
const authProtoPath = path.join(process.env.PROTO_PATH, "auth.proto")
const userProtoPath = path.join(process.env.PROTO_PATH, "user.proto")

const authPackageDefinition = protoLoader.loadSync(authProtoPath, {})
const userPackageDefinition = protoLoader.loadSync(userProtoPath, {})

const authProto = grpc.loadPackageDefinition(authPackageDefinition).auth
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user

const authClient = new authProto.AuthService(
    "localhost:50051",
    grpc.credentials.createInsecure()
)
const userClient = new userProto.UserService(
    "localhost:50052",
    grpc.credentials.createInsecure()
)

// Routes for user authentication
app.post("/register", (req, res) => {
    authClient.Register(req.body, (error, response) => {
        

        if (!response.success) {
            return res.status(400).json({
                success: false,
                message: response.message,
            })
        }
        userClient.CreateUserProfile(
            response.registerData,
            (error, response) => {
                if (!response.success) {
                    return res.status(400).json({
                        success: false,
                        message: response.message,
                    })
                }
            }
        )
        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            data: response.registerData,
        })
    })
})

app.post("/login", (req, res) => {
    authClient.Login(req.body, (error, response) => {
        if (!response.success) {
            return res.status(400).json({
                success: false,
                message: "Incorrect Password",
            })
        }

        res.status(201).json({
            success: true,
            message: "Login successful.",
            token: response.token,
        })
    })
})

// Routes for user management
app.put("/user", (req, res) => {
    userClient.UpdateUser(req.body, (error, response) => {
        if (error) return res.status(500).send(error)
        res.json(response)
    })
})

app.get("/getUser", (req, res) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res
            .status(401)
            .json({ message: "Authorization header is missing" })
    }

    const token = authHeader.split(" ")[1] // Extract token from "Bearer <token>"

    // Call VerifyUser in auth service to validate the token and get the user ID
    authClient.VerifyUser({ token }, (error, verifyResponse) => {
        if (error || !verifyResponse?.success) {
            return res.status(401).json({ message: "Not Authorized to access" })
        }

        // Ensure verifyResponse has a userId
        const userId = verifyResponse.userId
        if (!userId) {
            return res
                .status(400)
                .json({ message: "User ID not found in response" })
        }

        // Fetch the user details from user-service using the userId
        userClient.GetUser({ userId }, (error, userResponse) => {
            if (error || !userResponse?.success) {
                return res.status(400).json({
                    success: false,
                    message: "Could not find User",
                })
            }


            res.status(200).json({
                success: true,
                message: "User data retrieved successfully",
                user: userResponse.user, // Assuming userResponse contains `userData` with user info
            })
        })
    })
})

const PORT = process.env.PORT || 5050
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`)
})
