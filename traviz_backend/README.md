# Setting Up

+ Install mysql
+ Install Go 1.10+
+ Setup database using traviz.sql, dependencies.sql, and travista.sql
+ Grant ALL privileges to your user on the traviz database
+ The traviz_backend must be on the [GOPATH](https://github.com/golang/go/wiki/SettingGOPATH)
+ Update the config.json with your username and password for the database in the config.json file. Also update the location of where your traces dataset is.

# Building the backend

```
    > cd traviz_backend
    > go build
```

# Running the backend

```
    > ./traviz_backend -config=config.json
```
