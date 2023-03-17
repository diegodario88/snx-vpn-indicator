#!/usr/bin/expect -f

set pass [lindex $argv 0]

spawn snx

expect "Please enter your password:" {
    send "$pass\r\n"
}

expect {
    "SNX: Connection aborted" {
        send_user "Login Failed: $pass\n"
    }
    send_user "Login Successful: $pass\n"
}