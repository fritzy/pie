#!/bin/bash

echo "::/"
curl "http://localhost:8080/pie/billy/"
echo
echo
echo "::/somechannel/ items"
curl "http://localhost:8080/pie/billy/somechannel2/?type=item"
echo
echo
curl "http://localhost:8080/pie/billy/somechannel2/?type=item" -d '{"fish": "fantastic"}' -H "Content-Type: application/json"
echo
echo
