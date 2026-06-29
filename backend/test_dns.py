import dns.resolver
import socket

try:
    answers = dns.resolver.resolve("gnulinux.social", "MX", lifetime=3)
    print(f"MX records: {len(answers)}")
    for r in answers:
        print(f"  {r.exchange}")
except Exception as e:
    print(f"No MX record: {e}")

try:
    addrinfo = socket.getaddrinfo("gnulinux.social", 25)
    print(f"getaddrinfo port 25: {len(addrinfo)} results")
    for a in addrinfo:
        print(f"  {a[4]}")
except Exception as e:
    print(f"getaddrinfo failed: {e}")

try:
    sock = socket.create_connection(("gnulinux.social", 25), timeout=4)
    f = sock.makefile("rb")
    banner = f.readline()
    print(f"SMTP banner: {banner}")
    sock.sendall(b"EHLO test\r\n")
    ehlo = f.readline()
    print(f"EHLO response: {ehlo}")
    sock.sendall(b"MAIL FROM:<test@test.com>\r\n")
    mail = f.readline()
    print(f"MAIL FROM response: {mail}")
    sock.sendall(b"RCPT TO:<bce@gnulinux.social>\r\n")
    rcpt = f.readline()
    print(f"RCPT TO response: {rcpt}")
    sock.sendall(b"QUIT\r\n")
    f.close()
    sock.close()
except Exception as e:
    print(f"SMTP error: {e}")
