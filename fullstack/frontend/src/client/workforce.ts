export const getWorkforce = async () => {
  const token = localStorage.getItem("access_token")

  try {
    const res = await fetch("http://localhost:8001/api/v1/workforce", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      throw new Error("API not ready")
    }

    return await res.json()
  } catch (err) {
    console.log("Using mock workforce data")

    //  MOCK DATA 
    return [
      { id: 1, name: "Alice", role: "Frontend Developer" },
      { id: 2, name: "Bob", role: "Backend Developer" },
      { id: 3, name: "Charlie", role: "Security Engineer" },
    ]
  }
}