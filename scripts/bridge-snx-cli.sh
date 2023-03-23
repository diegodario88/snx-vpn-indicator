#!/usr/bin/expect -f

set pass [lindex $argv 0]

spawn snx

expect "Please enter your password:" {
    send "$pass\r"
}

expect "SNX: Connection aborted" {
    send_user "Login failed due to connection issues. Please ensure that you're connected to the internet and try again. If the problem persists, please contact support."
}
