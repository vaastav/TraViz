# Setting Up

+ Install mysql
+ Install Go 1.10+
+ Setup database using traviz.sql
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

# Setting up Views

After running the backend that builds up all the tables with the data,
set up the views that are used by the backend to make the queries
fast.
Set this up by doing `source views.sql` in a mysql command prompt
