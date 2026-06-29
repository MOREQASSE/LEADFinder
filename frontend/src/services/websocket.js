class NotificationSocket {
  constructor() {
    this.ws = null
    this.listeners = []
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/notifications`
    try {
      this.ws = new WebSocket(url)
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.listeners.forEach((fn) => fn(data))
      }
      this.ws.onclose = () => setTimeout(() => this.connect(), 5000)
    } catch (e) {
      console.warn('WebSocket not available, using polling')
    }
  }

  onNotification(fn) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  disconnect() {
    if (this.ws) this.ws.close()
  }
}

export default new NotificationSocket()
