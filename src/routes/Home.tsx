import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Welcome from Home page</h1>
      <Link to={"/about"}>About page</Link>
    </div>
  );
}
