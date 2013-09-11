#!/bin/bash

#curl "http://localhost:8080/pie/billy/testdir/?type=channel" -d "{}"
curl "http://localhost:8080/pie/billy/testdir/?type=item&id=item:43853375-9465-46f1-8066-26a29a5b00f1" -X DELETE
echo
echo "::/"
curl "http://localhost:8080/pie/billy/testdir/?type=item"
echo
echo
#curl "http://localhost:8080/pie/billy/testdir?type=file" -d @/Users/fritzy/thoseeyes.jpg -H "Content-Type: image/jpeg"
echo
echo
curl "http://localhost:8080/pie/billy/testdir/?type=item&id=item:34344060-beb5-46c3-b6f8-1d6b609e8152"
#curl "http://localhost:8080/pie/billy/testdir/?type=item&id=item:43853375-9465-46f1-8066-26a29a5b00f1"
echo
echo
curl -i "http://localhost:8080/pie/billy/testdir/?type=file&id=item:34344060-beb5-46c3-b6f8-1d6b609e8152"
echo
echo

