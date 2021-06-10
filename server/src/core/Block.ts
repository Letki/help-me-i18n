import { I18nFormatter } from "./I18nFormatter";
import { Node } from "estree";

export class Block {
  public readonly type: string;
  public readonly blockBodyNode: Node;
  public readonly formatter: I18nFormatter;
  constructor(type: string, blockNode: Node) {
    this.type = type;
    this.blockBodyNode = blockNode;
    this.formatter = new I18nFormatter(blockNode);
  }
}
