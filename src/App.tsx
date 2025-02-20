import  { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function QueryApp() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    setLoading(true);
    setResponse(null);
    try {
      console.log('Sending query')
      const res = await fetch("/api/query", { method: "POST",           headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }), });

      console.log("Response status:", res.status); // Log HTTP status
      console.log("Response headers:", res.headers); // Log headers
  
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
  
      const data = await res.json();
      console.log("Response data:", data); // Log response body
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error fetching data:", error);
      setResponse("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex flex-col w-screen min-h-screen items-center justify-center bg-gradient-to-r from-blue-500 to-green-700">
  <Card className="w-full max-w-2xl p-6 shadow-lg bg-white">
  <CardContent className="space-y-6 px-6 py-4 flex flex-col items-center text-center">
      <h1 className="text-4xl font-bold">Cotizador IMPAG</h1>
      <Input
        className="border-gray-300 text-gray-900 placeholder-gray-500"
        type="text"
        placeholder="Ingresa el o los productos a cotizar"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />
      <Button onClick={sendQuery} disabled={loading}>
        {loading ? "Generando..." : "Generar Cotización"}
      </Button>
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto break-words w-full max-w-lg max-h-[500px] min-h-[100px]">
      <code className="whitespace-pre-wrap">
      {response && (() => {
  try {
    const parsedResponse = JSON.parse(response); // Convert JSON string to object
    return parsedResponse.response.split("\\n").map((line: string, index: number) =>(
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  } catch (error) {
    console.error("Error formatting response:", error);
    return "Error formatting response"; // Handle parsing errors
  }
})()}
      </code>
      </pre>
    </CardContent>
  </Card>
</div>

  );
}
