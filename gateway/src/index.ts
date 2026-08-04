import express from 'express'
import type {Response, Request} from 'express'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/health', (req:Request,res:Response)=>{
  res.json({
    status:'healthy',
    service:'Nexus-Gate Gateway',
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, ()=>{
  console.log(`[Nexus-Gate] gateway listening on PORT ${PORT}`)
})